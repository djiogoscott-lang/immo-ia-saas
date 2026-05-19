import 'server-only';

/**
 * Embeddings Nomic Atlas — 768 dimensions, multilingue.
 *
 * Endpoint : https://api-atlas.nomic.ai/v1/embedding/text
 * Modèle   : nomic-embed-text-v1.5
 * Clé API  : NOMIC_API_KEY
 *
 * Nomic distingue 2 types de tâches (important pour la qualité RAG) :
 *   - `search_document` : pour indexer les fichiers (chunks)
 *   - `search_query`    : pour la question utilisateur
 *
 * Cette distinction améliore significativement la pertinence des matches
 * par rapport à un embedding "neutre".
 */

const NOMIC_API_URL = 'https://api-atlas.nomic.ai/v1/embedding/text';
const NOMIC_MODEL = 'nomic-embed-text-v1.5';
const EMBEDDING_DIMS = 768;
const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NomicTaskType = 'search_document' | 'search_query';

export interface EmbedResult {
  embeddings: number[][];
  totalTokens: number;
}

interface NomicEmbeddingResponse {
  embeddings: number[][];
  usage?: {
    total_tokens?: number;
  };
}

interface NomicErrorResponse {
  detail?: string | { msg?: string };
  message?: string;
}

// ---------------------------------------------------------------------------
// Embed documents (pour indexation des chunks)
// ---------------------------------------------------------------------------

export async function embedDocuments(texts: string[]): Promise<EmbedResult> {
  return embedTexts(texts, 'search_document');
}

// ---------------------------------------------------------------------------
// Embed query (pour la question utilisateur dans le chat)
// ---------------------------------------------------------------------------

export async function embedQuery(text: string): Promise<number[]> {
  const result = await embedTexts([text], 'search_query');
  const embedding = result.embeddings[0];
  if (!embedding) {
    throw new Error('Embedding vide retourné par Nomic');
  }
  if (embedding.length !== EMBEDDING_DIMS) {
    throw new Error(
      `Dimensions incorrectes : ${embedding.length}, attendu ${EMBEDDING_DIMS}`
    );
  }
  return embedding;
}

// ---------------------------------------------------------------------------
// Core (batché automatiquement)
// ---------------------------------------------------------------------------

async function embedTexts(
  texts: string[],
  taskType: NomicTaskType
): Promise<EmbedResult> {
  if (texts.length === 0) {
    return { embeddings: [], totalTokens: 0 };
  }

  const apiKey = process.env.NOMIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'NOMIC_API_KEY manquante. À configurer dans .env.local et Vercel env vars.'
    );
  }

  const all: number[][] = [];
  let totalTokens = 0;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const result = await embedBatch(batch, taskType, apiKey);
    all.push(...result.embeddings);
    totalTokens += result.totalTokens;
  }

  return { embeddings: all, totalTokens };
}

async function embedBatch(
  batch: string[],
  taskType: NomicTaskType,
  apiKey: string
): Promise<EmbedResult> {
  const response = await fetch(NOMIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: NOMIC_MODEL,
      texts: batch,
      task_type: taskType,
    }),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as NomicErrorResponse;
    const detail = typeof errorBody.detail === 'string'
      ? errorBody.detail
      : errorBody.detail?.msg;
    const msg =
      detail ??
      errorBody.message ??
      `HTTP ${response.status} ${response.statusText}`;
    throw new Error(`Nomic embed : ${msg}`);
  }

  const data = (await response.json()) as NomicEmbeddingResponse;

  if (!Array.isArray(data.embeddings) || data.embeddings.length !== batch.length) {
    throw new Error(
      `Nomic a retourné ${data.embeddings?.length ?? 0} embeddings pour ${batch.length} inputs`
    );
  }

  return {
    embeddings: data.embeddings,
    totalTokens: data.usage?.total_tokens ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Constantes exposées
// ---------------------------------------------------------------------------

export const EMBEDDING_DIMENSIONS = EMBEDDING_DIMS;
export const EMBEDDING_MODEL = NOMIC_MODEL;
