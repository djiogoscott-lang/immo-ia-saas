# Nestenn IA — Plateforme Multi-Agents V2

> SaaS IA pour les agences immobilières Nestenn. **12 agents spécialisés**
> (conseillers, managers, assistantes) propulsés par Claude 3.5 Sonnet via
> OpenRouter, avec orchestrateur LLM automatique, authentification Supabase
> et persistance des conversations.

---

## Sommaire

1. [Vue d'ensemble](#vue-densemble)
2. [Stack technique](#stack-technique)
3. [Quick Start](#quick-start)
4. [Architecture](#architecture)
5. [Les 12 agents](#les-12-agents)
6. [API routes](#api-routes)
7. [Structure du projet](#structure-du-projet)
8. [Variables d'environnement](#variables-denvironnement)
9. [Ajouter un nouvel agent](#ajouter-un-nouvel-agent)
10. [Conventions de code](#conventions-de-code)
11. [Roadmap](#roadmap)

---

## Vue d'ensemble

Nestenn IA passe d'un chatbot RAG juridique mono-agent (V1) à une plateforme
multi-agents inspirée de Limova AI (V2). Chaque agent est spécialisé pour
un cas d'usage métier précis (synthèse de RDV vendeur, prospection terrain,
analyse énergétique, suivi juridique, formation, pilotage d'équipe…).

Un **orchestrateur LLM** classe automatiquement la requête utilisateur vers
le bon agent si l'utilisateur ne le sélectionne pas manuellement.

L'accès aux agents est **filtré par rôle métier** (un conseiller ne voit pas
les agents managers, par exemple).

---

## Stack technique

| Brique | Techno | Pourquoi |
|---|---|---|
| Framework | **Next.js 14** App Router | SSR, streaming, conventions modernes |
| Style | **Tailwind CSS** | Design system rapide et consistant |
| Types | **TypeScript strict** | Refactor safe, autocomplete |
| Auth + DB | **Supabase** (Auth + PostgreSQL + RLS) | Tout intégré, hébergement géré |
| Embeddings | **Nomic** (via pgvector) | Souveraineté, coûts maîtrisés |
| LLM | **OpenRouter** (Claude 3.5 Sonnet pour agents, Haiku pour router) | Gateway multi-modèles, switch facile |
| Streaming | **Vercel AI SDK** (`ai` + `@ai-sdk/react`) | `useChat()` + `streamText()` |
| Markdown | **react-markdown** + **remark-gfm** | Tableaux, listes, code dans les réponses |
| Validation | **Zod** | Schémas runtime + types statiques |
| Icônes | **lucide-react** | Cohérence visuelle, tree-shaking |

---

## Quick Start

### Prérequis

- **Node.js** ≥ 18.18.0
- Accès à un projet **Supabase** (admin pour exécuter le SQL une fois)
- Une clé **OpenRouter** ([openrouter.ai](https://openrouter.ai))

### Installation

```bash
git clone https://github.com/djiogoscott-lang/nestenn-ia.git
cd nestenn-ia
npm install
```

### Configuration

1. **Variables d'environnement** : créer `.env.local` à la racine et y
   reporter les variables listées dans [Variables d'environnement](#variables-denvironnement).

2. **Schéma de base de données** : aller dans Supabase Dashboard →
   SQL Editor → New query, et coller le contenu de
   [`migrations/v2_schema.sql`](./migrations/v2_schema.sql).
   Cliquer **Run**.

3. **URLs de callback Auth** : Supabase Dashboard → Authentication →
   URL Configuration → Redirect URLs → ajouter
   `http://localhost:3000/auth/callback` (et le port que tu utiliseras
   pour la prod ensuite).

4. **(Optionnel pour le dev)** : Authentication → Providers → Email →
   désactiver "Confirm email" pour éviter de configurer un SMTP.

### Lancement

```bash
npm run dev
```

L'app démarre sur `http://localhost:3000` (ou le premier port libre suivant).
La route `/` redirige vers `/agents` (qui redirige vers `/login` si non auth).

### Premier compte

Va sur `/signup`, choisis ton rôle (conseiller / manager / assistante).
Un profil est automatiquement créé via le trigger SQL `handle_new_user`.

---

## Architecture

### Flow d'une requête chat

```
┌──────────────────────────────────────────────────────────────────┐
│                        BROWSER (client)                           │
│                                                                    │
│   AgentChat (useChat)  ──► POST /api/chat                         │
│         ▲                    { messages, agentId,                 │
│         │                      conversationId? }                  │
│         │                                                          │
│         │ stream chunks                                           │
└─────────┼──────────────────────────────────────────────────────────┘
          │
          │
┌─────────┼──────────────────────────────────────────────────────────┐
│         │                  NEXT.JS (server)                        │
│         │                                                          │
│   route.ts ─► 1. requireUser()  ──► Supabase Auth                 │
│               2. rateLimit()    ──► in-memory                      │
│               3. getAgent(id)   ──► registry.ts                    │
│               4. createConversation (si nouveau)                   │
│               5. addMessage(user)                                  │
│               6. streamText({ system: agent.systemPrompt, … })     │
│                  │                                                 │
│                  ▼                                                 │
│               OpenRouter API ─► Claude 3.5 Sonnet                  │
│                                                                    │
│               onFinish: addMessage(assistant, tokens)              │
└────────────────────────────────────────────────────────────────────┘
```

### Orchestrateur LLM

Quand l'utilisateur tape une requête libre sur la page d'accueil (sans
sélectionner un agent), `POST /api/route-agent` appelle Claude 3.5 Haiku
avec un schéma Zod strict pour classer la requête vers l'un des 12 agents.

- **Coût** : ~500-1500 tokens par appel (≈ 0,001 € en 2026)
- **Précision** : excellente sur des requêtes claires, faible sur les
  requêtes vagues (le router renvoie `confidence < 0.5` et l'UI demande
  une confirmation manuelle)

---

## Les 12 agents

| ID | Nom | Audience | Catégorie |
|---|---|---|---|
| `assist-immo` | Assist Immo | conseiller | Production |
| `my-boitage` | My Boitage | conseiller | Production |
| `my-dpe` | My DPE | conseiller | Analyse |
| `reunion-immo` | Réunion Immo | manager | Pilotage |
| `ma-perf-immo` | Ma Perf Immo | manager | Pilotage |
| `immo-predictor` | Immo Predictor | manager + conseiller | Analyse |
| `post-rdv-vendeur` | Post RDV Vendeur | conseiller | Communication |
| `redac-offre` | Rédac Offre | conseiller + assistante + manager | Production |
| `assistant-compromis` | Assistant Compromis | conseiller + assistante + manager | Communication |
| `my-juridic-assistant` | My Juridic Assistant | tous | Analyse |
| `train-my-agent` | Train My Agent | manager | Formation |
| `assistant-immo-vendeur` | Assistant Immo Vendeur | conseiller | Production |

Les system prompts détaillés sont dans
[`lib/agents/registry.ts`](./lib/agents/registry.ts).
Le miroir humainement lisible est dans
[`instruction.md`](./instruction.md).

---

## API routes

| Route | Méthode | Rôle | Auth requise |
|---|---|---|---|
| `/api/chat` | POST | Streaming d'une conversation avec un agent | Oui |
| `/api/route-agent` | POST | Classification automatique vers un agent | Oui |
| `/auth/callback` | GET | Callback Supabase Auth (email confirm + OAuth) | Non |
| `/auth/signout` | POST | Déconnexion | Oui |

### Format du body `/api/chat`

```ts
{
  agentId: "assist-immo" | "my-boitage" | ... ,    // requis
  messages: Array<{ role, content }>,              // requis
  conversationId?: string                          // optionnel (UUID)
}
```

### Headers de réponse

- `X-Conversation-Id` : UUID de la conversation (à ré-envoyer pour les
  messages suivants — sinon une nouvelle conv est créée à chaque message)
- `X-RateLimit-Remaining` : nombre de requêtes restantes dans la fenêtre
- `X-RateLimit-Reset` : timestamp ms de reset de la fenêtre

### Rate limits par défaut

| Endpoint | Limite | Fenêtre |
|---|---|---|
| `/api/chat` | 30 / user | 1 minute |
| `/api/route-agent` | 20 / user | 1 minute |
| Auth (login/signup) | 5 / IP | 15 minutes |

⚠️ Le rate limiter actuel est **in-memory** (single-instance). Pour la prod
serverless multi-instance, basculer vers Upstash Redis (voir
[`lib/rate-limit.ts`](./lib/rate-limit.ts) — même signature, drop-in).

---

## Structure du projet

```
.
├── app/
│   ├── (app)/agents/
│   │   ├── layout.tsx           # Sidebar + main (server async, charge user/profile)
│   │   ├── page.tsx             # /agents : RouterInput + Grid des 12 agents
│   │   └── [agentId]/
│   │       └── page.tsx         # /agents/[id] : valide l'id, rend AgentChat
│   ├── (auth)/
│   │   ├── layout.tsx           # Layout minimal pour login/signup
│   │   ├── login/page.tsx       # Form de connexion (server action)
│   │   └── signup/page.tsx      # Form d'inscription avec rôle
│   ├── api/
│   │   ├── chat/route.ts        # Streaming OpenRouter + persistance
│   │   └── route-agent/route.ts # Classification LLM
│   ├── auth/
│   │   ├── callback/route.ts    # Callback Supabase Auth
│   │   └── signout/route.ts     # POST signout
│   ├── globals.css              # Tailwind directives
│   ├── layout.tsx               # RootLayout (html + body)
│   └── page.tsx                 # Redirect vers /agents
│
├── components/
│   ├── agents/
│   │   ├── AgentSidebar.tsx     # Nav latérale (groupée par catégorie, filtrée par rôle)
│   │   ├── AgentGrid.tsx        # Cartes des 12 agents avec badges couleurs
│   │   ├── AgentCard.tsx        # (inline dans AgentGrid)
│   │   ├── AgentChat.tsx        # useChat() + markdown + actions
│   │   ├── AgentRouterInput.tsx # Barre de routing LLM auto
│   │   ├── MarkdownMessage.tsx  # Rendu Markdown stylé (react-markdown + remark-gfm)
│   │   └── QuickStartTemplates.tsx  # 3 cartes de démarrage par agent
│   └── auth/
│       └── UserMenu.tsx         # Avatar + badge rôle + signout
│
├── lib/
│   ├── agents/
│   │   ├── registry.ts          # 12 agents (system prompts, métadonnées)
│   │   ├── router.ts            # Orchestrateur LLM (generateObject + Zod)
│   │   └── templates.ts         # 36 templates quick-start (3 par agent)
│   ├── auth/
│   │   └── get-current-user.ts  # Helpers user/profile/requireUser
│   ├── supabase/
│   │   ├── server.ts            # Client server (cookies-based)
│   │   ├── client.ts            # Client browser
│   │   ├── middleware.ts        # Helper refresh session
│   │   └── conversations.ts     # CRUD conversations + messages
│   └── rate-limit.ts            # Rate limiter in-memory (sliding window)
│
├── migrations/
│   └── v2_schema.sql            # Tables + RLS + triggers
│
├── middleware.ts                # Protection routes /agents et /api/*
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
└── package.json
```

---

## Variables d'environnement

Toutes les variables sont lues via `process.env` côté serveur, ou
`process.env.NEXT_PUBLIC_*` côté client. **Ne jamais commiter les valeurs
réelles** — utiliser `.env.local` (ignoré par `.gitignore`).

| Variable | Obligatoire | Rôle |
|---|---|---|
| `OPENROUTER_API_KEY` | ✓ | Authentification API OpenRouter (LLM + router) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | Clé publique (RLS protège les données) |
| `SUPABASE_SERVICE_ROLE_KEY` | (futur) | Bypass RLS pour les jobs admin |
| `NEXT_PUBLIC_APP_URL` | recommandé | URL publique pour les headers OpenRouter |
| `NOMIC_API_KEY` | (RAG) | Embeddings pour le RAG (à venir) |
| `PISTE_CLIENT_ID` / `PISTE_CLIENT_SECRET` | (juridic) | API Légifrance pour My Juridic |
| `PISTE_TOKEN_URL` / `PISTE_API_URL` | (juridic) | URLs PISTE/DILA |
| `CRON_SECRET` | (cron) | Secret pour les jobs cron internes |

---

## Ajouter un nouvel agent

Tout part du registre — **3 étapes seulement** :

### 1. Ajouter l'ID au type

Dans [`lib/agents/registry.ts`](./lib/agents/registry.ts) :

```ts
export const AGENT_IDS = [
  // ... existants
  'mon-nouvel-agent',
] as const;
```

### 2. Ajouter le system prompt + entrée registre

```ts
const SYSTEM_PROMPT_MON_NOUVEL_AGENT = `Tu es Mon Nouvel Agent…${SECURITY_FOOTER}`;

export const AGENT_REGISTRY: Record<AgentId, AgentConfig> = {
  // ... existants
  'mon-nouvel-agent': {
    id: 'mon-nouvel-agent',
    name: 'Mon Nouvel Agent',
    tagline: 'Une phrase qui décrit son rôle',
    icon: 'Sparkles',           // nom d'une icône lucide-react
    audience: ['conseiller'],
    category: 'production',
    model: 'anthropic/claude-3.5-sonnet',
    temperature: 0.5,
    systemPrompt: SYSTEM_PROMPT_MON_NOUVEL_AGENT,
    routerKeywords: ['mot1', 'mot2', 'mot3'],
    greeting: "Message d'accueil…",
  },
};
```

### 3. Ajouter le mapping d'icône dans la Sidebar + Grid

Dans `components/agents/AgentSidebar.tsx` et `AgentGrid.tsx` :

```ts
import { Sparkles } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  // ... existants
  Sparkles,
};
```

Et **mettre à jour le CHECK SQL** dans
[`migrations/v2_schema.sql`](./migrations/v2_schema.sql) (table `conversations`)
pour inclure le nouvel ID, puis re-exécuter le script (idempotent).

### Bonus — 3 templates quick-start

Dans [`lib/agents/templates.ts`](./lib/agents/templates.ts), ajouter une
entrée dans `QUICK_START_TEMPLATES`.

---

## Conventions de code

- **TypeScript strict** : pas de `any`, pas de `@ts-ignore`.
- **Tailwind** : pas de CSS arbitraire en `style={...}`. Customisations via
  `tailwind.config.ts`.
- **Server vs Client Components** : par défaut server. `'use client'`
  uniquement quand nécessaire (hooks, événements, `useState`).
- **Pas de commentaires inutiles** : seulement quand le "pourquoi" n'est
  pas évident à la lecture du code.
- **Imports** : alias `@/*` configuré dans `tsconfig.json` (pointe sur la
  racine). Tri Prettier-style : externes → internes → relatifs.
- **Erreurs API** : format standardisé
  `{ error: 'code_snake_case', message: 'Phrase humaine.' }`.
- **Persistance** : la RLS Supabase est la source de vérité d'autorisation.
  Pas de double-check au niveau application sauf défense en profondeur.

---

## Roadmap

| Feature | État |
|---|---|
| 12 agents avec system prompts | ✓ |
| Orchestrateur LLM (router) | ✓ |
| Auth Supabase + RLS | ✓ |
| Persistance conversations + messages | ✓ |
| Rate limiting | ✓ in-memory |
| UI premium (badges, avatars, markdown) | ✓ |
| Templates de démarrage rapide | ✓ |
| Actions message (Copy / Regen / Export) | ✓ |
| Historique conversations dans la sidebar | À venir |
| File uploads (Supabase Storage) | À venir |
| RAG pgvector pour 4 agents (Rédac Offre, My Juridic, …) | À venir |
| Voice input (Train My Agent) | À venir |
| Tests unitaires + E2E | À venir |
| Monitoring coûts OpenRouter | À venir |
| Migration rate-limit vers Upstash | Quand serverless multi-instance |

---

## Licence

Propriétaire — Start Academy. Tous droits réservés.
