# Africa Marketplace — SaaS E-commerce + Affiliation + Livraison

Plateforme scalable pour l’Afrique (priorité Bénin) : marketplace, affiliés, livraison, paiements flexibles, moteur de règles Super Admin.

## Stack

- **Next.js 14** (App Router), TypeScript, Tailwind CSS, DaisyUI
- **Prisma** + PostgreSQL
- **Redis** + BullMQ
- **Stripe**, Mobile Money (mock), Wallet
- **S3**, Sentry, Docker

## Démarrage rapide

```bash
npm install
cp .env.example .env
docker compose up -d
npx prisma migrate dev --name init
npm run seed
npm run dev
```

- App : http://localhost:3000
- Compte Super Admin (seed) : `superadmin@marketplace.bj` / `Admin123!`

## Rôles

- **Super Admin** : règles globales, commissions, maintenance, users, dashboard financier
- **Fournisseur** : produits, zones livraison, ventes
- **Affilié** : liens, commissions, retraits, classement
- **Livreur** : missions, statuts, preuves
- **Client** : commandes, paiement (total / partiel / à la livraison), suivi

## Paiement

- Total avant livraison, partiel (avance + solde), à la livraison — configurable par Admin (produit, fournisseur, pays, user)
- Méthodes : Stripe, Mobile Money (MTN/Moov), wallet, cash on delivery

## Livraison

- Zones, tarifs (fixe / par distance / gratuit)
- Statuts : PENDING → ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED / FAILED / RETURNED
- Tracking : `/api/tracking/[orderId]`

## Thèmes DaisyUI

dark, business, corporate, luxury, cyberpunk — switch dans le dashboard, sauvegardé en local.

## Scripts

- `npm run dev` — Next.js
- `npm run build` / `npm run start` — production
- `npm run worker` — worker BullMQ (commandes, emails)
- `npm run db:studio` — Prisma Studio

## Checklist

- [x] npm install
- [x] cp .env.example .env
- [x] docker compose up
- [x] npx prisma migrate dev --name init
- [x] npm run seed
- [x] npm run dev

FIN.
