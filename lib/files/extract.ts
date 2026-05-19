import 'server-only';

/**
 * Extraction de texte brut depuis PDF / DOCX.
 *
 * - PDF  : pdf-parse (Mozilla pdf.js sous le capot, pas de native deps)
 * - DOCX : mammoth (extrait du texte, sans le formatage)
 *
 * Note: on importe pdf-parse via `lib/pdf-parse.js` pour éviter le bug
 * connu où la racine du package tente de lire un PDF test au boot.
 */

import type { AllowedMimeType } from '@/lib/supabase/agent-files';

export interface ExtractedDocument {
  text: string;
  meta: {
    pages?: number;
    words: number;
    chars: number;
  };
}

export async function extractText(
  buffer: Buffer,
  mimeType: AllowedMimeType
): Promise<ExtractedDocument> {
  switch (mimeType) {
    case 'application/pdf':
      return extractPdf(buffer);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractDocx(buffer);
    default: {
      // TS exhaustiveness check — au cas où un nouveau MIME est ajouté à la liste
      const _exhaustive: never = mimeType;
      throw new Error(`MIME type non supporté : ${_exhaustive}`);
    }
  }
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

async function extractPdf(buffer: Buffer): Promise<ExtractedDocument> {
  // Import direct du module interne pour éviter le bootstrap par défaut du package.
  // @ts-expect-error — pas de types pour le chemin interne
  const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
  const data = await pdfParse(buffer);

  const text = normalizeWhitespace(data.text);
  return {
    text,
    meta: {
      pages: data.numpages,
      words: countWords(text),
      chars: text.length,
    },
  };
}

// ---------------------------------------------------------------------------
// DOCX
// ---------------------------------------------------------------------------

async function extractDocx(buffer: Buffer): Promise<ExtractedDocument> {
  const mammoth = await import('mammoth');
  const { value } = await mammoth.extractRawText({ buffer });

  const text = normalizeWhitespace(value);
  return {
    text,
    meta: {
      words: countWords(text),
      chars: text.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeWhitespace(s: string): string {
  return s
    .replace(/\r\n?/g, '\n')      // CRLF → LF
    .replace(/[ \t]+/g, ' ')      // multi-spaces → 1
    .replace(/\n{3,}/g, '\n\n')   // 3+ blank lines → 2
    .trim();
}

function countWords(s: string): number {
  if (!s) return 0;
  return s.split(/\s+/).filter(Boolean).length;
}
