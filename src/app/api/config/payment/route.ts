import { NextResponse } from 'next/server';
import { isKkiapayConfigured } from '@/lib/kkiapay';

/**
 * Configuration paiement (public) : permet au front de savoir si KKiaPay est disponible.
 */
export async function GET() {
  const enabled = isKkiapayConfigured();
  return NextResponse.json({
    kkiapayEnabled: enabled,
    kkiapayPublicKey: enabled ? (process.env.KKIAPAY_PUBLIC_KEY ?? '') : undefined,
    kkiapaySandbox: enabled ? process.env.KKIAPAY_SANDBOX === 'true' : undefined,
  });
}
