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

import { APP_NAME } from '@/lib/branding';
import { AGENT_IDS, AGENT_LIST, type AgentId } from './registry';

// Modèle du router. Modifier ici si tu veux switcher (Mistral, Sonnet, etc.).
const ROUTER_MODEL = 'mistralai/mistral-large-2411' as const;

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

  return `Tu es l'orchestrateur de ${APP_NAME}. Ton rôle UNIQUE est de lire la requête en langage naturel d'un utilisateur immobilier (conseiller, manager ou assistante) et de choisir l'agent spécialisé le plus adapté pour y répondre.

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
   - moins de 0.40 → la requête est trop vague ou hors-sujet ; renvoie "charly" par défaut (l'orchestratrice qui clarifiera)

3. "reasoning" : UNE phrase courte (≤ 30 mots) en français expliquant pourquoi cet agent. Pas de paraphrase de la requête, pas de remerciement.

4. Tu réponds UNIQUEMENT au format JSON conforme au schéma. Aucun texte avant ou après le JSON.

═══════════════════════════════════════════════════════════════
EXEMPLES
═══════════════════════════════════════════════════════════════

Requête : "J'ai besoin d'un script d'appel pour relancer un vendeur silencieux depuis 15 jours"
→ {"agentId":"tom","confidence":0.96,"reasoning":"Script d'appel pour relance client : cœur de métier de Tom (téléphonie & relation client)."}

Requête : "Crée-moi un post LinkedIn pour annoncer un nouveau mandat"
→ {"agentId":"john","confidence":0.97,"reasoning":"Post réseaux sociaux pour annonce : domaine de John (marketing & RS)."}

Requête : "Rédige une annonce optimisée SEO pour SeLoger sur un T3 à Nice"
→ {"agentId":"lou","confidence":0.95,"reasoning":"Annonce portail immobilier + SEO : c'est précisément le scope de Lou."}

Requête : "J'ai photographié 10 boîtes aux lettres ce matin"
→ {"agentId":"elio","confidence":0.97,"reasoning":"Extraction OCR de noms de boîtes aux lettres en prospection terrain : Elio (commercial & prospection)."}

Requête : "Calcule la rentabilité locative d'un appart à 220 000 € loué 950 €"
→ {"agentId":"manue","confidence":0.97,"reasoning":"Calcul de rentabilité locative : cœur de métier de Manue (comptable & finances)."}

Requête : "Quel est le délai de rétractation après compromis de vente ?"
→ {"agentId":"julia","confidence":0.94,"reasoning":"Question juridique sur le compromis : domaine d'expertise de Julia (loi Hoguet, transactions)."}

Requête : "Prépare ma réunion d'équipe de lundi"
→ {"agentId":"rony","confidence":0.93,"reasoning":"Préparation de réunion commerciale managériale : Rony (RH & management)."}

Requête : "Lance une analyse DPE pour Nice avec les prix par classe"
→ {"agentId":"theo","confidence":0.96,"reasoning":"Analyse énergétique par classe DPE : agent spécialisé Théo."}

Requête : "J'ai les fichiers DVF et INSEE pour Marseille, lance l'étude de marché"
→ {"agentId":"ines","confidence":0.96,"reasoning":"Étude de marché DVF + INSEE : agent spécialisé Inès."}

Requête : "Je veux rédiger une offre d'achat"
→ {"agentId":"anais","confidence":0.95,"reasoning":"Rédaction d'offre d'achat conforme : agent spécialisé Anaïs."}

Requête : "Bonjour"
→ {"agentId":"charly","confidence":0.30,"reasoning":"Requête conversationnelle sans intention claire ; orientation vers l'orchestratrice Charly."}`;
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
      'X-Title': `${APP_NAME} - Router`,
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
