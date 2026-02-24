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
