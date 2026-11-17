# HAFIZ — Votre Assistant IA Intelligent

Assistant personnel conversationnel basé sur l'IA. Version 1 : chatbot (Web responsive).

## Architecture

```
hafiz/
├── packages/shared/   Types & contrats d'API partagés (Web, API, futur mobile)
├── apps/api/          Backend Node.js + Express + TypeScript + Prisma (PostgreSQL)
│   ├── prisma/          Schéma et migrations
│   └── src/
│       ├── ai/          Couche IA multi-fournisseurs (OpenAI, mock…) + prompt système
│       ├── config/      Variables d'environnement validées (zod)
│       ├── middleware/  Authentification Supabase (JWT), gestion des erreurs
│       ├── routes/      /api/me, /api/conversations
│       └── services/    Logique métier (conversations, Supabase Storage)
├── apps/web/          Frontend React + TypeScript + Tailwind CSS (Vite)
│   └── src/ (pages, components, contexts, lib)
└── apps/mobile/       Emplacement réservé pour l'app React Native / Expo
```

**Flux** : le navigateur s'authentifie auprès de Supabase Auth → envoie le jeton
d'accès à l'API → l'API vérifie la signature du jeton, puis lit/écrit en base
**uniquement les données de cet utilisateur** → appelle OpenAI côté serveur et
renvoie la réponse en streaming (Server-Sent Events).

### Sécurité
- La clé OpenAI et la clé `service_role` Supabase restent **côté serveur** (`apps/api/.env`).
  Le frontend ne contient que des valeurs publiques (`VITE_*` : URL Supabase, clé `anon`, URL de l'API).
- Chaque requête est authentifiée (JWT Supabase vérifié : signature, émetteur, audience, expiration).
- Toutes les requêtes en base sont filtrées par `userId` (tests d'isolation inclus).
- Row Level Security activée sur les tables : la clé publique Supabase ne donne aucun accès direct.
- Helmet, CORS restreint, limite de taille des requêtes, limitation du nombre de messages (20/min/utilisateur), validation zod.

### API
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/health` | État du service (public) |
| GET | `/api/me` | Profil de l'utilisateur connecté |
| GET | `/api/conversations` | Historique (plus récent d'abord) |
| POST | `/api/conversations` | Nouvelle conversation |
| GET | `/api/conversations/:id` | Conversation + messages |
| PATCH | `/api/conversations/:id` | Renommer |
| DELETE | `/api/conversations/:id` | Supprimer (messages compris) |
| POST | `/api/conversations/:id/messages` | Envoyer un message ; réponse en SSE (`user_message`, `conversation`, `delta`, `assistant_message`, `error`, `done`) |

Erreurs : `{ "error": { "code": "...", "message": "..." } }` (messages en français).

## Démarrage local

Prérequis : Node.js ≥ 20.19, PostgreSQL (local ou Supabase), un projet Supabase.

```bash
cd hafiz
npm install
cp apps/api/.env.example apps/api/.env   # puis remplir
cp apps/web/.env.example apps/web/.env   # puis remplir
npm run db:migrate -w @hafiz/api          # crée les tables
npm run dev:api                           # http://localhost:4000
npm run dev:web                           # http://localhost:5173
```

Configuration Supabase :
1. **Project Settings → API** : récupérer l'URL, la clé `anon` (frontend) et, pour l'API, le
   *JWT Secret* (projets en HS256) ou rien (projets à clés asymétriques : l'API utilise le JWKS).
2. **Authentication → URL Configuration** : ajouter l'URL du site (ex. `http://localhost:5173`, puis l'URL Vercel).
3. **Database → Connection string** : `DATABASE_URL` = pooler (port 6543, ajouter `?pgbouncer=true`),
   `DIRECT_URL` = connexion directe (port 5432) pour les migrations.
4. *(Optionnel, futur)* **Storage** : créer un bucket privé `hafiz-files`.

Sans clé OpenAI, mettre `AI_PROVIDER=mock` pour développer avec des réponses simulées (interdit en production).

## Tests

```bash
npm test          # tests d'intégration de l'API (PostgreSQL requis, IA simulée)
npm run typecheck
npm run build
```

Les tests couvrent : authentification (jeton absent, invalide, expiré), CRUD des
conversations, streaming SSE, transmission de l'historique à l'IA, erreurs IA,
validation, **isolation entre utilisateurs**, suppression en cascade.

## Déploiement

**Frontend (Vercel)** — Root directory : `hafiz/apps/web` ; framework Vite ;
install command : `cd ../.. && npm install` ; build command : `cd ../.. && npm run build:shared && npm run build -w @hafiz/web` ;
output : `dist`. Variables : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`.
`vercel.json` gère les routes de la SPA.

**Backend (Render, Railway, Fly.io…)** — Root : `hafiz` ;
build : `npm install && npm run build:shared && npm run build -w @hafiz/api && npm run db:deploy -w @hafiz/api` ;
start : `npm run start -w @hafiz/api`. Renseigner les variables de `apps/api/.env.example`
(`NODE_ENV=production`, `CORS_ORIGINS=https://votre-app.vercel.app`, …).

## Ajouter un fournisseur d'IA

1. Créer `apps/api/src/ai/providers/<nom>.ts` implémentant l'interface `AIProvider` (`streamChat`).
2. L'enregistrer dans `apps/api/src/ai/registry.ts`.
3. Choisir `AI_PROVIDER=<nom>`.

## Logo

Le logo est `apps/web/public/logo.svg` (provisoire). Remplacez ce fichier par le logo officiel HAFIZ
(même nom, ou adaptez `components/Logo.tsx`).

## Feuille de route
- v1 ✅ chatbot, historique, authentification, responsive
- Pièces jointes (Supabase Storage — service déjà prêt côté API), choix du modèle
- Application mobile Expo (voir `apps/mobile/README.md`)
- Génération d'images, recherche Internet, assistant vocal
