/**
 * Devises : chaque produit a sa devise source (choisie par le fournisseur).
 * Le système de paiement (Mobile Money, KkiaPay, etc.) n'accepte que certaines devises.
 * Si la devise du produit n'est pas acceptée, on notifie le client et on propose une conversion
 * vers une devise acceptée avant validation.
 */

export const CANONICAL_CURRENCY = 'XOF' as const;

/** Devises acceptées par le système de paiement (ex. Mobile Money / KkiaPay). */
export const PAYMENT_ACCEPTED_CURRENCIES: string[] = ['XOF'];

/** 1 unité de devise → XOF (ex. 1 EUR = 655.957 XOF). À configurer côté admin si besoin. */
export const RATE_TO_XOF: Record<string, number> = {
  XOF: 1,
  EUR: 655.957,
  USD: 600,
};

/** Indique si la devise est acceptée pour le paiement en ligne. */
export function isPaymentAcceptedCurrency(currency: string): boolean {
  return PAYMENT_ACCEPTED_CURRENCIES.includes(String(currency).trim().toUpperCase());
}

/** Convertit un montant de la devise source vers XOF. */
export function convertToXOF(amount: number, fromCurrency: string): number {
  const rate = RATE_TO_XOF[String(fromCurrency).trim().toUpperCase()] ?? 1;
  return amount * rate;
}

/** Montant de livraison fixe en XOF (utilisé quand la commande est convertie en XOF). */
export const SHIPPING_AMOUNT_XOF = 2000;

/** Livraison dans une autre devise : équivalent de SHIPPING_AMOUNT_XOF (pour affichage / commande en devise produit). */
export function shippingInCurrency(currency: string): number {
  if (currency.toUpperCase() === 'XOF') return SHIPPING_AMOUNT_XOF;
  const rate = RATE_TO_XOF[currency.toUpperCase()];
  if (!rate || rate <= 0) return SHIPPING_AMOUNT_XOF;
  return Math.round((SHIPPING_AMOUNT_XOF / rate) * 100) / 100;
}
