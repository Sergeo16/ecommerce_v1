/**
 * KKiaPay — agrégateur Mobile Money (MTN, Moov) et cartes
 * @see https://docs.kkiapay.me/v1/plugin-et-sdk/sdk-javascript
 * @see https://docs.kkiapay.me/v1/plugin-et-sdk/admin-sdks-server-side
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
let kkiapayInstance: any = null;

function getKkiapay() {
  if (!process.env.KKIAPAY_PRIVATE_KEY || !process.env.KKIAPAY_PUBLIC_KEY || !process.env.KKIAPAY_SECRET_KEY) {
    return null;
  }
  if (!kkiapayInstance) {
    const { kkiapay } = require('@kkiapay-org/nodejs-sdk');
    kkiapayInstance = kkiapay({
      privatekey: process.env.KKIAPAY_PRIVATE_KEY,
      publickey: process.env.KKIAPAY_PUBLIC_KEY,
      secretkey: process.env.KKIAPAY_SECRET_KEY,
      sandbox: process.env.KKIAPAY_SANDBOX === 'true',
    });
  }
  return kkiapayInstance;
}

export function isKkiapayConfigured(): boolean {
  return !!(
    process.env.KKIAPAY_PUBLIC_KEY &&
    process.env.KKIAPAY_PRIVATE_KEY &&
    process.env.KKIAPAY_SECRET_KEY
  );
}

export interface KkiapayVerifyResult {
  success: boolean;
  status?: string;
  transactionId?: string;
  amount?: number;
  message?: string;
}

/**
 * Vérifie une transaction KKiaPay côté serveur (obligatoire pour éviter la fraude).
 * @param transactionId Identifiant renvoyé par le widget après paiement
 */
export async function verifyKkiapayTransaction(transactionId: string): Promise<KkiapayVerifyResult> {
  const k = getKkiapay();
  if (!k) {
    return { success: false, message: 'KKiaPay non configuré' };
  }
  try {
    const response = await k.verify(transactionId);
    const status = (response?.status ?? response?.transaction?.status ?? '').toString().toUpperCase();
    const success = status === 'SUCCESS';
    return {
      success,
      status,
      transactionId: response?.transactionId ?? response?.transaction?.id ?? transactionId,
      amount: response?.amount ?? response?.transaction?.amount,
      message: success ? undefined : (response?.message ?? `Statut: ${status}`),
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message ?? 'Échec vérification KKiaPay',
    };
  }
}
