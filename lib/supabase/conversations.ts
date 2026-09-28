import 'server-only';

/**
 * Helpers de persistance des conversations et messages multi-agents.
 *
 * Toutes les fonctions utilisent le client server-side (cookies-based session).
 * La RLS Supabase garantit qu'un user ne peut accéder qu'à SES propres
 * conversations — pas besoin de re-vérifier l'ownership ici.
 */

import { createClient } from './server';

import type { AgentId } from '@/lib/agents/registry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Conversation {
  id: string;
  user_id: string;
  agent_id: AgentId;
  title: string;
  created_at: string;
  updated_at: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface DbMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  tokens_in: number | null;
  tokens_out: number | null;
  model_used: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export async function createConversation(params: {
  userId: string;
  agentId: AgentId;
  title?: string;
}): Promise<Conversation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: params.userId,
      agent_id: params.agentId,
      title: params.title ?? 'Nouvelle conversation',
    })
    .select()
    .single();

  if (error) {
    console.error('[createConversation]', error.message);
    return null;
  }
  return data as Conversation;
}

export async function listConversations(
  userId: string,
  limit = 50
): Promise<Conversation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[listConversations]', error.message);
    return [];
  }
  return (data ?? []) as Conversation[];
}

export async function getConversation(
  conversationId: string
): Promise<Conversation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) {
    console.error('[getConversation]', error.message);
    return null;
  }
  return data as Conversation;
}

export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('conversations')
    .update({ title })
    .eq('id', conversationId);

  if (error) {
    console.error('[updateConversationTitle]', error.message);
    return false;
  }
  return true;
}

export async function deleteConversation(conversationId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);

  if (error) {
    console.error('[deleteConversation]', error.message);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function getMessages(conversationId: string): Promise<DbMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[getMessages]', error.message);
    return [];
  }
  return (data ?? []) as DbMessage[];
}

export async function addMessage(params: {
  conversationId: string;
  role: MessageRole;
  content: string;
  tokensIn?: number | null;
  tokensOut?: number | null;
  modelUsed?: string | null;
}): Promise<DbMessage | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: params.conversationId,
      role: params.role,
      content: params.content,
      tokens_in: params.tokensIn ?? null,
      tokens_out: params.tokensOut ?? null,
      model_used: params.modelUsed ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('[addMessage]', error.message);
    return null;
  }
  return data as DbMessage;
}

/**
 * Génère un titre court à partir du premier message utilisateur.
 * Tronqué à ~60 caractères, sans casser un mot.
 */
export function generateConversationTitle(firstUserMessage: string): string {
  const cleaned = firstUserMessage.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= 60) return cleaned;
  const truncated = cleaned.slice(0, 60);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 30 ? truncated.slice(0, lastSpace) : truncated) + '…';
}
