/**
 * Page de chat actif avec UN agent : `/agents/[agentId]`.
 *
 * Server component qui :
 *   1. Valide l'agentId via `isValidAgentId()` → 404 si inconnu
 *   2. Charge la config complète via `getAgent()`
 *   3. Délègue le rendu interactif à `<AgentChat>` (composant client)
 *
 * Le system prompt n'est JAMAIS envoyé au client : il reste côté serveur
 * dans la route /api/chat, qui le ré-injecte à chaque requête via le
 * registre. Seuls les éléments d'identité (name, tagline, icon, greeting…)
 * passent au composant client.
 */

import { notFound } from 'next/navigation';

import { AgentWorkspace } from '@/components/agents/AgentWorkspace';
import { getAgent, isValidAgentId } from '@/lib/agents/registry';
import { APP_NAME, APP_NAME_SHORT } from '@/lib/branding';

interface AgentChatPageProps {
  params: { agentId: string };
}

// Métadonnées dynamiques par agent (titre d'onglet).
export async function generateMetadata({ params }: AgentChatPageProps) {
  if (!isValidAgentId(params.agentId)) {
    return { title: `Agent introuvable — ${APP_NAME_SHORT}` };
  }
  const agent = getAgent(params.agentId);
  return {
    title: `${agent.name} — ${APP_NAME}`,
    description: agent.tagline,
  };
}

export default function AgentChatPage({ params }: AgentChatPageProps) {
  if (!isValidAgentId(params.agentId)) {
    notFound();
  }

  const agent = getAgent(params.agentId);

  return <AgentWorkspace agent={agent} />;
}
