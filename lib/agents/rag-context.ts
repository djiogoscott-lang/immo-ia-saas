import 'server-only';

/**
 * Construit le contexte RAG à injecter dans le system prompt d'un agent.
 *
 * Flow :
 *   1. Embed la dernière question user (Nomic, task_type=search_query)
 *   2. Recherche les top-N chunks (cosine similarity, threshold 0.5)
 *   3. Formate en bloc Markdown injecté dans le system prompt
 *
 * Robuste aux pannes : si Nomic est down ou la clé est manquante, on log
 * un warning et on retourne un contexte vide — le chat continue sans RAG
 * plutôt que de bloquer l'utilisateur.
 */

import { embedQuery } from '@/lib/embeddings/nomic';
import { hasSearchableFiles, matchChunks, type ChunkMatch } from '@/lib/supabase/agent-files';

export interface RagContext {
  /** Préfixe à ajouter au system prompt original (vide si pas de matches). */
  systemPromptAddon: string;
  /** Sources matchées (pour télémétrie / UI future). */
  sources: ChunkMatch[];
}

export interface BuildRagOptions {
  /** Seuil de similarité cosine, 0..1. Défaut 0.5. */
  threshold?: number;
  /** Top-N chunks à récupérer. Défaut 5. */
  count?: number;
  /**
   * ID de la conversation courante. Si fourni, le RAG cherche dans les
   * fichiers globaux du user + ceux attachés à cette conversation précise
   * (ignore les fichiers d'autres conversations).
   */
  conversationId?: string | null;
}

export async function buildRagContext(
  userQuestion: string,
  userId: string,
  options: BuildRagOptions = {}
): Promise<RagContext> {
  const trimmed = userQuestion.trim();
  if (!trimmed) {
    return { systemPromptAddon: '', sources: [] };
  }

  // Aucun fichier indexé → rien à chercher : on évite l'appel Nomic.
  if (!(await hasSearchableFiles(userId, options.conversationId ?? null))) {
    return { systemPromptAddon: '', sources: [] };
  }

  let embedding: number[];
  try {
    embedding = await embedQuery(trimmed);
  } catch (err) {
    console.warn(
      '[RAG] embedQuery failed, chat will proceed without RAG context:',
      err instanceof Error ? err.message : err
    );
    return { systemPromptAddon: '', sources: [] };
  }

  let sources: ChunkMatch[];
  try {
    // Paramètres ajustés (2026-05-22) après constat de récupération trop conservatrice :
    // - threshold 0.25 (vs 0.5) → capte les passages modérément pertinents, pas seulement
    //   les correspondances quasi-exactes
    // - count 12 (vs 5)       → injecte plus de chunks pour vue large du document
    // Le bon compromis dépend du domaine ; ces valeurs sont saines pour de l'analyse
    // de PDF juridiques/immo où l'information utile est souvent paraphrasée.
    sources = await matchChunks(embedding, userId, {
      threshold: options.threshold ?? 0.25,
      count: options.count ?? 12,
      conversationId: options.conversationId ?? null,
    });
  } catch (err) {
    console.warn(
      '[RAG] matchChunks failed, chat will proceed without RAG context:',
      err instanceof Error ? err.message : err
    );
    return { systemPromptAddon: '', sources: [] };
  }

  if (sources.length === 0) {
    return { systemPromptAddon: '', sources: [] };
  }

  // Formate en bloc Markdown injecté en tête du system prompt
  const blocks = sources
    .map((s, idx) => {
      const score = (s.similarity * 100).toFixed(0);
      return `### [E${idx + 1}] — ${s.file_name} (pertinence ${score}%)\n${s.content}`;
    })
    .join('\n\n---\n\n');

  const systemPromptAddon = [
    '## CONTEXTE — Extraits des fichiers de l\'utilisateur',
    '',
    "L'utilisateur a téléversé des fichiers. Ci-dessous, les extraits les plus pertinents par rapport à sa question, identifiés par un libellé court : [E1], [E2], etc.",
    '',
    blocks,
    '',
    '---',
    '',
    '## RÈGLES D\'USAGE DE CE CONTEXTE (priorité maximale)',
    '',
    "1. **Utilise EN PRIORITÉ ces extraits** pour formuler ta réponse. Ne réécris pas de mémoire ce qui est déjà dans le document.",
    "2. **Cite TOUJOURS la source** quand tu reprends une information : note le libellé entre crochets à la fin de la phrase, ex : « Le délai de rétractation est de 10 jours [E2]. »",
    "3. **Si la réponse complète n'est PAS dans les extraits**, dis-le clairement : « Les extraits fournis ne mentionnent pas X. Voici ce que je peux dire en m'appuyant sur mes connaissances générales : … » — puis poursuis sans citation.",
    "4. **N'invente JAMAIS** un chiffre, un article de loi, un nom propre, une date qui ne serait pas dans les extraits OU dans une source vérifiable (Légifrance pour Julia, INSEE pour Inès, etc.).",
    "5. À la fin de ta réponse, ajoute une mini-section **Sources utilisées** listant les libellés [E1] etc. que tu as réellement cités (omets ceux non utilisés).",
    '',
    '---',
    '',
  ].join('\n');

  return { systemPromptAddon, sources };
}
