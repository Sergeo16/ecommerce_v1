/**
 * Notifications admin : plateforme, email, WhatsApp
 * L'admin configure les canaux via Paramètres > Notifications des commandes
 */
import { prisma } from '@/lib/db';
import { addEmailJob, addNotificationJob } from '@/lib/queue';

export type AdminNotificationChannels = {
  platform?: boolean;
  email?: boolean;
  whatsapp?: boolean;
};

export type AdminNotificationConfig = {
  channels: AdminNotificationChannels;
  emailOverride?: string | null;
  whatsappPhoneOverride?: string | null;
};

const DEFAULT_CHANNELS: AdminNotificationChannels = {
  platform: true,
  email: false,
  whatsapp: false,
};

export async function getAdminNotificationConfig(): Promise<AdminNotificationConfig> {
  const settings = await prisma.settings.findMany({
    where: {
      key: {
        in: [
          'admin_notification_channels',
          'admin_notification_email',
          'admin_notification_whatsapp_phone',
        ],
      },
    },
  });
  const byKey = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  const channels = (byKey.admin_notification_channels as AdminNotificationChannels) ?? DEFAULT_CHANNELS;
  const emailOverride =
    typeof byKey.admin_notification_email === 'string' &&
    byKey.admin_notification_email.trim()
      ? String(byKey.admin_notification_email).trim()
      : null;
  const whatsappPhoneOverride =
    typeof byKey.admin_notification_whatsapp_phone === 'string' &&
    byKey.admin_notification_whatsapp_phone.trim()
      ? String(byKey.admin_notification_whatsapp_phone).trim()
      : null;

  return { channels, emailOverride, whatsappPhoneOverride };
}

export async function notifyAdminOrderCreated(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
      companyProfile: { select: { companyName: true } },
      items: { include: { product: { select: { name: true } } } },
    },
  });
  if (!order) return;

  const config = await getAdminNotificationConfig();
  const admins = await prisma.user.findMany({
    where: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
    select: { id: true, email: true, phone: true },
  });

  const clientLabel = order.user
    ? `${order.user.firstName} ${order.user.lastName}`
    : order.guestFirstName || order.guestLastName
      ? `${order.guestFirstName ?? ''} ${order.guestLastName ?? ''}`.trim()
      : order.guestEmail ?? 'Invité';
  const itemsSummary = order.items
    .map((i) => `${i.product.name} × ${i.quantity}`)
    .join(', ');
  const title = `Nouvelle commande ${order.orderNumber}`;
  const body = `${clientLabel} — ${order.companyProfile.companyName} — ${itemsSummary} — ${Number(order.total).toLocaleString('fr-FR')} ${order.currency}`;

  // Plateforme : notifications in-app pour chaque admin
  if (config.channels.platform && admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: 'order_created',
        title,
        body,
        data: { orderId, orderNumber: order.orderNumber },
      })),
    });
  }

  // Email
  const adminEmail = config.emailOverride ?? admins[0]?.email;
  if (config.channels.email && adminEmail) {
    await addEmailJob(
      adminEmail,
      title,
      'admin_order_created',
      {
        orderNumber: order.orderNumber,
        orderId,
        clientLabel,
        companyName: order.companyProfile.companyName,
        itemsSummary,
        total: Number(order.total),
        currency: order.currency,
      }
    ).catch(() => {});
  }

  // WhatsApp
  const adminPhone = config.whatsappPhoneOverride ?? admins[0]?.phone;
  if (config.channels.whatsapp && adminPhone) {
    await addNotificationJob('whatsapp', {
      to: adminPhone,
      type: 'admin_order_created',
      orderNumber: order.orderNumber,
      orderId,
      body,
    }).catch(() => {});
  }
}
