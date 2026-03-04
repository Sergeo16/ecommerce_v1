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
- **KKiaPay** (1er moyen Mobile Money intégré) : MTN Mobile Money, Moov Money, cartes (Visa, Mastercard) — Bénin et région. Si les clés KKiaPay sont configurées dans `.env`, le checkout utilise le widget KKiaPay pour les paiements en XOF (total ou acompte). Vérification obligatoire côté serveur (anti-fraude). Voir [Intégration KKiaPay](#intégration-kkiapay) ci-dessous.
- Méthodes additionnelles : Stripe, wallet, cash on delivery (mock Mobile Money si KKiaPay non configuré).

## Livraison

- Zones, tarifs (fixe / par distance / gratuit)
- Statuts : PENDING → ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED / FAILED / RETURNED
- **Notification admin à chaque commande** : l’admin reçoit une notification (plateforme, et optionnellement email / WhatsApp selon Paramètres > Notifications des commandes) avec tous les détails utiles pour confier la livraison : client, adresse et téléphone de livraison, fournisseur et contact, liste des articles, total.
- **Confier la livraison** : depuis Dashboard Admin > Commandes, l’admin peut cliquer « Confier livraison » pour chaque commande. Il peut assigner soit un **livreur enregistré** sur la plateforme, soit un **contact externe** (nom + téléphone) s’il n’y a pas de livreur disponible ou proche du fournisseur. L’assignation est enregistrée (livreur plateforme ou champs `externalCourierName` / `externalCourierPhone`).
- **Suivi livraison** : activable/désactivable par le Super Admin (Paramètres globaux). Quand activé, l’admin, le fournisseur et le client peuvent suivre la livraison via `GET /api/tracking/[orderId]` (authentification requise, accès restreint au commande concernée).

## Mode maintenance

- Le Super Admin peut **activer/désactiver le mode maintenance** à tout moment (Paramètres globaux → « Mode maintenance »).
- Quand il est **activé** : le public voit uniquement une page « Maintenance en cours » sur tout le site.
- **Connexion admin possible** : les pages **`/auth/login`** et **`/auth/register`** restent accessibles pendant la maintenance. L’admin peut ainsi se connecter puis accéder au dashboard et désactiver la maintenance si besoin.
- **Aperçu « comme le public »** : sans désactiver la maintenance, l’admin peut cliquer sur « Voir le site comme le public (aperçu) » dans le bandeau orange. Il voit alors exactement la page de maintenance telle que le public la voit. Un bouton « Quitter l’aperçu » le ramène au dashboard. Permet de vérifier le rendu avant de rouvrir le site.

## Identité des fournisseurs

- **Visibilité contrôlée par l’admin** (Paramètres globaux → « Afficher l’identité des fournisseurs »).
- **Par défaut : masquée** — les clients ne voient pas « Vendu par [nom] » sur les produits, pour inciter les commandes via la plateforme (commissions).
- Si l’admin active l’option, le nom du fournisseur est affiché sur le catalogue et la fiche produit.

## Inscription fournisseur

- **Obligatoire** : nom de l’entreprise, numéro de téléphone, adresse (saisie ou position GPS).
- **Optionnel** : prénom et nom du contact.
- Sur l’inscription, si le rôle « Fournisseur » est choisi : champ « Nom de l’entreprise » *, téléphone *, adresse * (avec bouton « Utiliser ma position » pour remplir via GPS). Prénom et nom deviennent optionnels.

## Produits (publication)

- **Devise** : choix dans une liste (XOF, EUR, USD, etc.) ou saisie personnalisée (« Autre »).
- **Catégorie** : choix dans la liste existante ou saisie d’une nouvelle catégorie (création automatique si besoin).
- **Images / vidéos** : soit URL, soit **upload depuis l’appareil** (API `POST /api/supplier/upload`, puis URL renvoyée utilisée comme image/vidéo du produit).
- **Validation** : messages d’erreur (champs requis, caractères non autorisés, etc.) dans la **langue de l’utilisateur** (FR/EN).

## Boutique & checkout

- **Quantité** : modifiable sur la fiche produit et sur la page checkout (sélecteur − / nombre / +).
- **Adresse de livraison** : bouton « Utiliser ma position » pour remplir l’adresse et la ville via géolocalisation (reverse geocoding). Coordonnées GPS optionnellement enregistrées avec la commande pour le livreur.

## Navigation

- **Logo** : présent sur toutes les pages (barre globale en haut). Un clic sur le logo renvoie à l’accueil.

## Thèmes DaisyUI

dark, business, corporate, luxury, cyberpunk — switch dans le dashboard, sauvegardé en local.

## Intégration KKiaPay

[KKiaPay](https://kkiapay.me) est l’agrégateur de paiement Mobile Money (MTN, Moov) et cartes utilisé en priorité pour les paiements en XOF.

### Références

- [Documentation KKiaPay](https://docs.kkiapay.me/v1/)
- [SDK JavaScript (widget)](https://docs.kkiapay.me/v1/plugin-et-sdk/sdk-javascript) — chargement du script, `openKkiapayWidget`, `addSuccessListener` / `addFailedListener`
- [SDK serveur (Node.js)](https://docs.kkiapay.me/v1/plugin-et-sdk/admin-sdks-server-side) — vérification des transactions côté API
- [Sécurité](https://docs.kkiapay.me/v1/securite/untitled) — HTTPS, chiffrement, vérification obligatoire des transactions
- [Création de compte](https://docs.kkiapay.me/v1/compte/creation-dun-compte) — inscription KKiaPay
- [Méthodes de paiement](https://docs.kkiapay.me/v1/paiements/methodes-de-paiement) — Mobile Money, cartes
- [Sandbox / test](https://docs.kkiapay.me/v1/compte/kkiapay-sandbox-guide-de-test) — mode test et numéros de téléphone de test

### Configuration (.env)

Récupérer les clés dans le [tableau de bord KKiaPay](https://kkiapay.me) → **Développeurs** → **Clés API**.

| Variable | Description |
|----------|-------------|
| `KKIAPAY_PUBLIC_KEY` | Clé API publique (affichée dans le widget côté client) |
| `KKIAPAY_PRIVATE_KEY` | Clé privée (serveur uniquement) |
| `KKIAPAY_SECRET_KEY` | Clé secrète (serveur uniquement) |
| `KKIAPAY_SANDBOX` | `true` pour le mode test, `false` en production |

Si les trois clés sont renseignées, le checkout propose automatiquement le paiement via KKiaPay pour les commandes en **XOF** (paiement total ou acompte). Sinon, le flux Mobile Money mock est utilisé.

### Flux technique

1. **Checkout** : l’utilisateur valide la commande (total ou acompte en XOF).
2. **Création commande** : `POST /api/orders` avec `paymentGateway: "KKIAPAY"` crée une commande en statut `PENDING` et renvoie `orderNumber`, `amountToPay` et les paramètres KKiaPay (clé publique, sandbox).
3. **Widget** : le front charge le script `https://cdn.kkiapay.me/k.js`, ouvre le widget KKiaPay (Mobile Money uniquement : `paymentmethod: "momo"`), avec montant et clé.
4. **Succès** : `addSuccessListener` reçoit le `transactionId`. Le front appelle `POST /api/orders/verify-kkiapay` avec `orderNumber` et `transactionId`.
5. **Vérification serveur** : l’API vérifie la transaction auprès de KKiaPay (SDK Node.js `k.verify(transactionId)`), met la commande en `CONFIRMED`, enregistre le paiement et déclenche les jobs (emails, livraison, commissions).

Aucune commande n’est confirmée sans vérification côté serveur (recommandation KKiaPay anti-fraude).

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


**Méthode 1 : Reset complet (Recommandée si vous voulez vraiment tout écraser)**
```bash
# 1. Récupérer toutes les informations du dépôt distant
git fetch origin

# 2. Réinitialiser votre branche locale pour qu'elle corresponde exactement à la branche distante
git reset --hard origin/main

# 3. Nettoyer tous les fichiers non suivis (optionnel, mais recommandé)
git clean -fd
```

**Explication :**
- `git fetch origin` : Télécharge les dernières informations du dépôt distant sans modifier vos fichiers locaux
- `git reset --hard origin/main` : Réinitialise votre branche locale `main` pour qu'elle corresponde exactement à `origin/main`. **Toutes vos modifications locales non commitées seront perdues**
- `git clean -fd` : Supprime tous les fichiers et dossiers non suivis par Git (fichiers créés localement mais jamais ajoutés à Git)

**Méthode 2 : Checkout direct (Alternative simple)**
```bash
# 1. Récupérer les dernières informations
git fetch origin

# 2. Forcer le checkout de la branche distante
git checkout -f origin/main

# 3. Déplacer votre branche locale sur cette version
git branch -f main origin/main

# 4. Revenir sur votre branche locale
git checkout main
```

**Explication :**
- `git fetch origin` : Télécharge les informations du dépôt distant
- `git checkout -f origin/main` : Force le checkout de la version distante (ignore les modifications locales)
- `git branch -f main origin/main` : Force votre branche locale `main` à pointer vers `origin/main`
- `git checkout main` : Revenir sur votre branche locale (maintenant identique à la distante)

## 📄 Licence

Propriétaire - Tous droits réservés

## 👥 Support

Pour toute question ou problème, contactez l'équipe de développement.

---

**Développé par Open Digital Land**
