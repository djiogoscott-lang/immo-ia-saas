import 'server-only';

/**
 * Helpers de persistance des livrables d'agents (NAIOM pattern).
 *
 * Chaque livrable est un message d'agent que l'utilisateur a choisi
 * d'archiver. Il porte un frontmatter YAML auto-généré (client, agent,
 * date, version, status...) pour l'audit et la reproductibilité.
 *
 * RLS Supabase garantit qu'un user n'accède qu'à ses propres livrables.
 */

import { createClient } from './server';

import type { AgentId } from '@/lib/agents/registry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeliverableStatus = 'draft' | 'final' | 'archived';

export interface Deliverable {
  id: string;
  user_id: string;
  conversation_id: string | null;
  agent_id: AgentId;
  campagne: string | null;
  type: string;
  slug: string;
  frontmatter: Record<string, unknown>;
  markdown_body: string;
  version: number;
  status: DeliverableStatus;
  parent_id: string | null;
  model_used: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  prompt_source: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDeliverableInput {
  userId: string;
  agentId: AgentId;
  type: string;
  slug: string;
  markdownBody: string;
  campagne?: string;
  conversationId?: string;
  modelUsed?: string;
  tokensIn?: number;
  tokensOut?: number;
  promptSource?: string;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createDeliverable(
  input: CreateDeliverableInput
): Promise<Deliverable | null> {
  const supabase = createClient();

  const frontmatter: Record<string, unknown> = {
    agent: input.agentId,
    type: input.type,
    slug: input.slug,
    campagne: input.campagne ?? null,
    date: new Date().toISOString(),
    version: 1,
    status: 'draft',
    ...(input.modelUsed && { model: input.modelUsed }),
    ...(input.tokensIn != null && { tokens_in: input.tokensIn }),
    ...(input.tokensOut != null && { tokens_out: input.tokensOut }),
    ...(input.promptSource && { prompt_source: input.promptSource }),
  };

  const { data, error } = await supabase
    .from('agent_deliverables')
    .insert({
      user_id: input.userId,
      conversation_id: input.conversationId ?? null,
      agent_id: input.agentId,
      campagne: input.campagne ?? null,
      type: input.type,
      slug: input.slug,
      frontmatter,
      markdown_body: input.markdownBody,
      model_used: input.modelUsed ?? null,
      tokens_in: input.tokensIn ?? null,
      tokens_out: input.tokensOut ?? null,
      prompt_source: input.promptSource ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('[createDeliverable]', error.message);
    return null;
  }
  return data as Deliverable;
}

export interface ListDeliverablesOptions {
  agentId?: AgentId;
  campagne?: string;
  status?: DeliverableStatus;
  limit?: number;
  offset?: number;
}

export async function listDeliverables(
  userId: string,
  options: ListDeliverablesOptions = {}
): Promise<Deliverable[]> {
  const supabase = createClient();
  let query = supabase
    .from('agent_deliverables')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options.agentId) query = query.eq('agent_id', options.agentId);
  if (options.campagne) query = query.eq('campagne', options.campagne);
  if (options.status) query = query.eq('status', options.status);
  if (options.limit) query = query.limit(options.limit);
  if (options.offset && options.limit) {
    query = query.range(options.offset, options.offset + options.limit - 1);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[listDeliverables]', error.message);
    return [];
  }
  return (data ?? []) as Deliverable[];
}

export async function getDeliverable(id: string): Promise<Deliverable | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('agent_deliverables')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Deliverable;
}

// ---------------------------------------------------------------------------
// Sérialisation Markdown + frontmatter YAML
// ---------------------------------------------------------------------------

/**
 * Sérialise un livrable au format Markdown avec frontmatter YAML en tête.
 * Format compatible Jekyll / Hugo / Astro / NAIOM.
 *
 * @example
 * ```
 * ---
 * agent: julia
 * type: consultation-juridique
 * date: 2026-05-19T14:30:00Z
 * version: 1
 * status: draft
 * ---
 *
 * # Délai de rétractation après compromis
 * ...
 * ```
 */
export function serializeAsMarkdown(deliverable: Deliverable): string {
  const yaml = Object.entries(deliverable.frontmatter)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => {
      if (typeof v === 'string') return `${k}: ${v}`;
      if (typeof v === 'number' || typeof v === 'boolean') return `${k}: ${v}`;
      return `${k}: ${JSON.stringify(v)}`;
    })
    .join('\n');

  return `---\n${yaml}\n---\n\n${deliverable.markdown_body}`;
}
