/**
 * Worker BullMQ : commandes, emails, commissions, livraisons
 */
import { createOrderWorker, createEmailWorker } from '../src/lib/queue';
import { prisma } from '../src/lib/db';

async function processOrderJob(job: { name: string; data: Record<string, unknown> }) {
  if (job.name === 'created') {
    const orderId = job.data.orderId as string;
    if (orderId) {
      await prisma.order.update({ where: { id: orderId }, data: {} }).catch(() => {});
      console.log('[Worker] Order created:', orderId);
    }
  }
}

async function processEmailJob(job: { data: Record<string, unknown> }) {
  const { to, subject, template } = job.data;
  console.log('[Worker] Email would send:', { to, subject, template });
  // Intégrer SendGrid, Resend, etc.
}

function run() {
  const orderWorker = createOrderWorker(async (job) => {
    await processOrderJob(job);
  });
  const emailWorker = createEmailWorker(async (job) => {
    await processEmailJob(job);
  });

  orderWorker.on('completed', (job) => console.log('Order job completed', job.id));
  emailWorker.on('completed', (job) => console.log('Email job completed', job.id));
  orderWorker.on('failed', (job, err) => console.error('Order job failed', job?.id, err));
  emailWorker.on('failed', (job, err) => console.error('Email job failed', job?.id, err));

  console.log('Workers started (orders, emails).');
}

run().catch(console.error);
