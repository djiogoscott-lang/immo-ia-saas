import 'server-only';

/**
 * Helpers RAG — fichiers utilisateurs partagés entre tous les agents.
 *
 * Stockage : bucket Supabase Storage "agent-files" (privé).
 * Path convention : `{userId}/{fileId}.{ext}` (RLS storage par préfixe).
 * Embeddings : Nomic Atlas (vector 768 dims).
 *
 * RLS DB : isolation par user_id. Le client session (avec cookies) suffit
 * pour toutes les opérations — pas besoin de service-role en mode sync inline.
 */

import { createClient } from './server';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

export const STORAGE_BUCKET = 'agent-files';
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentFileStatus = 'processing' | 'ready' | 'error';

export interface AgentFile {
  id: string;
  user_id: string;
  storage_path: string;
  name: string;
  size_bytes: number;
  mime_type: string;
  status: AgentFileStatus;
  error_message: string | null;
  chunks_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChunkInput {
  file_id: string;
  user_id: string;
  chunk_index: number;
  content: string;
  embedding: number[];        // Nomic 768 dims
  tokens?: number;
}

export interface ChunkMatch {
  chunk_id: string;
  file_id: string;
  file_name: string;
  chunk_index: number;
  content: string;
  similarity: number;
}

// ---------------------------------------------------------------------------
// Storage — upload / download / delete
// ---------------------------------------------------------------------------

export function buildStoragePath(userId: string, fileId: string, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return `${userId}/${fileId}.${safeExt}`;
}

export async function uploadToStorage(
  path: string,
  body: ArrayBuffer | Buffer | Blob,
  contentType: string
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, body, { contentType, upsert: false });
  if (error) return { error: error.message };
  return {};
}

export async function deleteFromStorage(path: string): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) return { error: error.message };
  return {};
}

export async function getSignedDownloadUrl(
  path: string,
  expiresInSeconds = 300
): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// CRUD agent_files
// ---------------------------------------------------------------------------

export interface CreateAgentFileInput {
  userId: string;
  storagePath: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
}

export async function createAgentFile(
  input: CreateAgentFileInput
): Promise<AgentFile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('agent_files')
    .insert({
      user_id: input.userId,
      storage_path: input.storagePath,
      name: input.name,
      size_bytes: input.sizeBytes,
      mime_type: input.mimeType,
      status: 'processing' satisfies AgentFileStatus,
    })
    .select()
    .single();

  if (error) {
    console.error('[createAgentFile]', error.message);
    return null;
  }
  return data as AgentFile;
}

export async function updateAgentFileStatus(
  fileId: string,
  status: AgentFileStatus,
  options: { errorMessage?: string; chunksCount?: number } = {}
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('agent_files')
    .update({
      status,
      error_message: options.errorMessage ?? null,
      chunks_count: options.chunksCount ?? undefined,
    })
    .eq('id', fileId);

  if (error) {
    console.error('[updateAgentFileStatus]', error.message);
    return false;
  }
  return true;
}

export async function getAgentFile(fileId: string): Promise<AgentFile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('agent_files')
    .select('*')
    .eq('id', fileId)
    .maybeSingle();
  if (error || !data) return null;
  return data as AgentFile;
}

export interface ListAgentFilesOptions {
  status?: AgentFileStatus;
  limit?: number;
  offset?: number;
}

export async function listAgentFiles(
  userId: string,
  options: ListAgentFilesOptions = {}
): Promise<AgentFile[]> {
  const supabase = createClient();
  let query = supabase
    .from('agent_files')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options.status) query = query.eq('status', options.status);
  if (options.limit) query = query.limit(options.limit);
  if (options.offset && options.limit) {
    query = query.range(options.offset, options.offset + options.limit - 1);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[listAgentFiles]', error.message);
    return [];
  }
  return (data ?? []) as AgentFile[];
}

/**
 * Suppression cascade : Storage object + DB row (chunks droppés par FK CASCADE).
 * On supprime le storage d'abord car la suppression DB est facilement révocable.
 */
export async function deleteAgentFile(
  fileId: string,
  storagePath: string
): Promise<{ error?: string }> {
  const storageRes = await deleteFromStorage(storagePath);
  if (storageRes.error) {
    return { error: `Storage : ${storageRes.error}` };
  }

  const supabase = createClient();
  const { error } = await supabase.from('agent_files').delete().eq('id', fileId);
  if (error) return { error: error.message };
  return {};
}

// ---------------------------------------------------------------------------
// Chunks — insert bulk + recherche similarité
// ---------------------------------------------------------------------------

/**
 * Insert bulk de chunks. Le vector(1024) est passé tel quel comme array de
 * numbers — supabase-js le sérialise correctement pour pgvector.
 */
export async function insertChunks(chunks: ChunkInput[]): Promise<{ error?: string }> {
  if (chunks.length === 0) return {};
  const supabase = createClient();

  // pgvector accepte les arrays via le format string '[v1,v2,...]'
  // pour garantir la compatibilité, on convertit explicitement.
  const rows = chunks.map((c) => ({
    file_id: c.file_id,
    user_id: c.user_id,
    chunk_index: c.chunk_index,
    content: c.content,
    embedding: `[${c.embedding.join(',')}]`,
    tokens: c.tokens ?? null,
  }));

  const { error } = await supabase.from('agent_files_chunks').insert(rows);
  if (error) return { error: error.message };
  return {};
}

export interface MatchChunksOptions {
  threshold?: number; // 0..1, défaut 0.5
  count?: number;     // top-N, défaut 5
}

export async function matchChunks(
  queryEmbedding: number[],
  userId: string,
  options: MatchChunksOptions = {}
): Promise<ChunkMatch[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('match_agent_files_chunks', {
    query_embedding: `[${queryEmbedding.join(',')}]`,
    p_user_id: userId,
    p_threshold: options.threshold ?? 0.5,
    p_count: options.count ?? 5,
  });

  if (error) {
    console.error('[matchChunks]', error.message);
    return [];
  }
  return (data ?? []) as ChunkMatch[];
}
