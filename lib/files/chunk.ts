import 'server-only';

/**
 * Chunking de texte brut pour RAG.
 *
 * Stratégie greedy par paragraphes :
 *   1. Split par double newline (paragraphes).
 *   2. Pack greedy jusqu'à ~targetChars caractères par chunk.
 *   3. Si un paragraphe seul dépasse maxChars, split par phrases.
 *   4. Overlap entre chunks adjacents pour préserver le contexte.
 *
 * Pas de tokenizer précis — on raisonne en caractères (~4 chars/token GPT).
 */

export interface ChunkOptions {
  /** Taille cible d'un chunk, en caractères. Défaut 1000 (~250 tokens). */
  targetChars?: number;
  /** Taille max absolue avant de forcer un split. Défaut 1500. */
  maxChars?: number;
  /** Chevauchement entre chunks adjacents. Défaut 200. */
  overlapChars?: number;
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  // Cibles ajustées (2026-05-22) pour améliorer la qualité du RAG :
  // chunks plus longs (1500 chars) = plus de contexte cohérent par extrait.
  // Effet uniquement sur les NOUVEAUX uploads — les fichiers déjà indexés
  // gardent leurs chunks d'origine tant qu'ils ne sont pas re-uploadés.
  const target = options.targetChars ?? 1500;
  const max = options.maxChars ?? 2200;
  const overlap = options.overlapChars ?? 250;

  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= max) return [trimmed];

  // Split par paragraphes
  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buffer = '';

  for (const p of paragraphs) {
    // Paragraphe trop long → split par phrases
    if (p.length > max) {
      if (buffer) {
        chunks.push(buffer);
        buffer = '';
      }
      for (const piece of splitBySentence(p, target, max)) {
        chunks.push(piece);
      }
      continue;
    }

    const candidate = buffer ? `${buffer}\n\n${p}` : p;
    if (candidate.length > target && buffer) {
      // On flush le buffer actuel et on commence un nouveau chunk avec ce paragraphe
      chunks.push(buffer);
      buffer = p;
    } else {
      buffer = candidate;
    }
  }

  if (buffer) chunks.push(buffer);

  // Overlap : on prefixe chaque chunk (sauf le 1er) par les `overlap` derniers
  // caractères du chunk précédent.
  if (overlap > 0 && chunks.length > 1) {
    for (let i = 1; i < chunks.length; i++) {
      const prev = chunks[i - 1];
      const tail = prev.slice(-overlap);
      chunks[i] = `${tail}\n\n${chunks[i]}`;
    }
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Split par phrases (regex simple FR/EN — pas parfait sur les abréviations)
// ---------------------------------------------------------------------------

function splitBySentence(text: string, target: number, max: number): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý])/u)
    .map((s) => s.trim())
    .filter(Boolean);

  const out: string[] = [];
  let buffer = '';

  for (const s of sentences) {
    // Phrase plus longue que max : split brutal par caractères
    if (s.length > max) {
      if (buffer) {
        out.push(buffer);
        buffer = '';
      }
      for (let i = 0; i < s.length; i += target) {
        out.push(s.slice(i, i + target));
      }
      continue;
    }
    const candidate = buffer ? `${buffer} ${s}` : s;
    if (candidate.length > target && buffer) {
      out.push(buffer);
      buffer = s;
    } else {
      buffer = candidate;
    }
  }

  if (buffer) out.push(buffer);
  return out;
}
