import 'server-only';

/**
 * Orchestrateur LLM (router) — choisit dynamiquement l'agent le plus adapté
 * à une requête utilisateur en langage naturel.
 *
 * Approche : LLM classification via `generateObject` + schéma Zod strict.
 * Le LLM doit retourner un `agentId` parmi les 12 valeurs littérales du
 * registre — toute valeur hors-liste est rejetée par Zod et la requête échoue
 * (pas de fallback silencieux qui masquerait un bug du LLM).
 *
 * Modèle utilisé : Claude 3.5 Haiku — plus rapide et moins cher que Sonnet,
 * largement suffisant pour une tâche de classification.
 *
 * Coût attendu : ~500-1500 tokens input (liste des agents + requête utilisateur),
 * ~50-100 tokens output (JSON court). Soit ~0,001 € par routage en 2026.
 */

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateObject } from 'ai';
import { z } from 'zod';

import { AGENT_IDS, AGENT_LIST, type AgentId } from './registry';

// Modèle du router. Modifier ici si tu veux switcher (Mistral, Sonnet, etc.).
const ROUTER_MODEL = 'anthropic/claude-3.5-haiku' as const;

// ---------------------------------------------------------------------------
// Schéma de validation de la sortie du LLM
// ---------------------------------------------------------------------------

const RoutingResultSchema = z.object({
  agentId: z.enum(AGENT_IDS as unknown as readonly [AgentId, ...AgentId[]]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1).max(500),
});

export type RoutingResult = z.infer<typeof RoutingResultSchema>;

// ---------------------------------------------------------------------------
// Construction du system prompt à partir du registre (single source of truth)
// ---------------------------------------------------------------------------

function buildRouterSystemPrompt(): string {
  const agentsList = AGENT_LIST.map((agent, idx) =>
    `${idx + 1}. id="${agent.id}" — ${agent.name}
   Rôle : ${agent.tagline}
   Audience : ${agent.audience.join(', ')}
   Mots-clés : ${agent.routerKeywords.join(', ')}`
  ).join('\n\n');

  return `Tu es l'orchestrateur de Nestenn IA. Ton rôle UNIQUE est de lire la requête en langage naturel d'un utilisateur immobilier (conseiller, manager ou assistante) et de choisir l'agent spécialisé le plus adapté pour y répondre.

═══════════════════════════════════════════════════════════════
AGENTS DISPONIBLES (12)
═══════════════════════════════════════════════════════════════

${agentsList}

═══════════════════════════════════════════════════════════════
RÈGLES DE ROUTAGE
═══════════════════════════════════════════════════════════════

1. "agentId" : retourne EXACTEMENT l'un des ids listés ci-dessus. Aucune autre valeur n'est acceptée.

2. "confidence" :
   - 0.90 à 1.00 → la requête correspond clairement et sans ambiguïté à un agent
   - 0.65 à 0.89 → la requête est plausible pour cet agent mais d'autres pourraient convenir
   - 0.40 à 0.64 → ambigu ; tu fais ton meilleur choix mais signale-le
   - moins de 0.40 → la requête est trop vague ou hors-sujet ; renvoie "assist-immo" par défaut (l'agent le plus polyvalent)

3. "reasoning" : UNE phrase courte (≤ 30 mots) en français expliquant pourquoi cet agent. Pas de paraphrase de la requête, pas de remerciement.

4. Tu réponds UNIQUEMENT au format JSON conforme au schéma. Aucun texte avant ou après le JSON.

═══════════════════════════════════════════════════════════════
EXEMPLES
═══════════════════════════════════════════════════════════════

Requête : "Je viens de faire un RDV vendeur, j'ai besoin d'un mail de remerciement et d'un plan marketing"
→ {"agentId":"assist-immo","confidence":0.96,"reasoning":"Synthèse de RDV vendeur + livrables marketing : c'est précisément le cœur d'Assist Immo."}

Requête : "J'ai photographié 10 boîtes aux lettres ce matin"
→ {"agentId":"my-boitage","confidence":0.97,"reasoning":"Extraction OCR de noms de boîtes aux lettres en prospection terrain : exactement le cas d'usage de My Boitage."}

Requête : "Quel est le délai de rétractation après compromis de vente ?"
→ {"agentId":"my-juridic-assistant","confidence":0.92,"reasoning":"Question juridique sur le compromis : domaine d'expertise du Juridic Assistant (loi Hoguet, copropriété)."}

Requête : "Je veux entraîner mon nouveau conseiller au porte-à-porte"
→ {"agentId":"train-my-agent","confidence":0.95,"reasoning":"Formation à la prospection porte-à-porte via jeu de rôle : c'est Train My Agent."}

Requête : "Prépare ma réunion d'équipe de lundi"
→ {"agentId":"reunion-immo","confidence":0.94,"reasoning":"Préparation de réunion commerciale managériale : Coach Réunion Immo."}

Requête : "Bonjour"
→ {"agentId":"assist-immo","confidence":0.25,"reasoning":"Requête trop vague pour un routage précis ; orientation vers l'agent généraliste par défaut."}`;
}

// ---------------------------------------------------------------------------
// Fonction principale
// ---------------------------------------------------------------------------

/**
 * Analyse une requête utilisateur et renvoie l'agent le plus adapté.
 *
 * @throws Si OPENROUTER_API_KEY est manquante ou si le LLM échoue.
 */
export async function routeQuery(text: string): Promise<RoutingResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY manquante dans process.env. Le router LLM ne peut pas démarrer.'
    );
  }

  const openrouter = createOpenRouter({
    apiKey,
    headers: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      'X-Title': 'Nestenn IA - Router',
    },
  });

  const { object } = await generateObject({
    model: openrouter.chat(ROUTER_MODEL),
    schema: RoutingResultSchema,
    schemaName: 'AgentRouting',
    schemaDescription:
      "Choix de l'agent IA spécialisé le plus adapté à la requête utilisateur.",
    system: buildRouterSystemPrompt(),
    prompt: `Requête de l'utilisateur :\n\n"${text}"\n\nQuel agent doit traiter cette requête ?`,
    temperature: 0.1, // déterminisme maximum : on veut le même choix pour la même requête
  });

  return object;
}
