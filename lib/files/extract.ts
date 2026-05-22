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

import { ocrPdfWithPixtral } from '@/lib/files/ocr';
import type { AllowedMimeType } from '@/lib/supabase/agent-files';

export interface ExtractedDocument {
  text: string;
  meta: {
    pages?: number;
    words: number;
    chars: number;
    /** True si le contenu provient d'un OCR (PDF scanné/image), pas du texte natif. */
    ocrUsed?: boolean;
    /** Détail OCR si utilisé (pages traitées vs total, erreurs eventuelles). */
    ocrInfo?: {
      pagesProcessed: number;
      totalPages: number;
      truncated: boolean;
      errorsCount: number;
    };
  };
}

/**
 * Seuil sous lequel on considère que l'extraction texte native a echoue
 * (PDF probablement scanne / image-based) et on bascule sur l'OCR Pixtral.
 * 200 chars = 30-40 mots, en dessous on n'a pas grand-chose d'utile.
 */
const OCR_FALLBACK_THRESHOLD_CHARS = 200;

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
  // 1. Tentative pdf-parse (rapide, texte natif)
  // @ts-expect-error — pas de types pour le chemin interne
  const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
  const data = await pdfParse(buffer);
  const nativeText = cleanPdfText(data.text ?? '');

  // 2. Si on a assez de texte, on s'arrete la
  if (nativeText.length >= OCR_FALLBACK_THRESHOLD_CHARS) {
    return {
      text: nativeText,
      meta: {
        pages: data.numpages,
        words: countWords(nativeText),
        chars: nativeText.length,
        ocrUsed: false,
      },
    };
  }

  // 3. Sinon, bascule OCR Pixtral via OpenRouter
  console.log(`[extract] PDF texte natif insuffisant (${nativeText.length} chars), bascule OCR Pixtral...`);
  try {
    const ocr = await ocrPdfWithPixtral(buffer);
    const cleanedOcr = cleanPdfText(ocr.text);

    // Si OCR n'a rien produit non plus, on retourne ce qu'on a (probablement vide)
    if (cleanedOcr.length < 20) {
      return {
        text: nativeText, // ce qu'on avait, meme insuffisant
        meta: {
          pages: data.numpages,
          words: countWords(nativeText),
          chars: nativeText.length,
          ocrUsed: true,
          ocrInfo: {
            pagesProcessed: ocr.pagesProcessed,
            totalPages: ocr.totalPages,
            truncated: ocr.truncated,
            errorsCount: Object.keys(ocr.errors).length,
          },
        },
      };
    }

    return {
      text: cleanedOcr,
      meta: {
        pages: ocr.totalPages,
        words: countWords(cleanedOcr),
        chars: cleanedOcr.length,
        ocrUsed: true,
        ocrInfo: {
          pagesProcessed: ocr.pagesProcessed,
          totalPages: ocr.totalPages,
          truncated: ocr.truncated,
          errorsCount: Object.keys(ocr.errors).length,
        },
      },
    };
  } catch (err) {
    // OCR a echoue (cle manquante, timeout, etc.) : on retourne le natif tel quel
    // pour que le pipeline upload propage une erreur claire au lieu de stocker rien
    console.warn(`[extract] OCR fallback echoue: ${err instanceof Error ? err.message : err}`);
    return {
      text: nativeText,
      meta: {
        pages: data.numpages,
        words: countWords(nativeText),
        chars: nativeText.length,
        ocrUsed: false,
      },
    };
  }
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

/**
 * Pipeline de nettoyage PDF complet (CVs, mandats, brochures avec layout visuel).
 *
 * Problèmes adressés (constatés à l'audit du 2026-05-22) :
 *   - pdf-parse rend les icônes Unicode (téléphone, mail, link) comme un "n"
 *     qui se retrouve isolé en début de ligne devant une vraie donnée
 *     (ex: "n +33 7 53 25 45 41", ")n djiogoscott@gmail.com")
 *   - Puces variées (▸ ▪ • ► ●) → normaliser en "- "
 *   - Tirets de césure en fin de ligne ("infor-\nmatique") → recoller
 *   - Caractères non imprimables résiduels
 *   - Espaces avant ponctuation francaise
 */
function cleanPdfText(raw: string): string {
  let s = raw;

  // 1. Normalisation préliminaire des sauts de ligne
  s = s.replace(/\r\n?/g, '\n');

  // 2. Retirer les caractères de contrôle invisibles (sauf newline et tab)
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 3. Artéfacts d'icônes pdf-parse : "n" ou ")n" isolé devant une donnée
  //    Exemples : "n +33", ")n djiogo@", "n linkedin.com"
  //    Pattern : ([^A-Za-zÀ-ÿ]|^)[)\]]?n\s+(?=[+\d@a-zA-Z])
  s = s.replace(/([^A-Za-zÀ-ÿ0-9]|^)[)\]]?n\s+(?=[+\d])/g, '$1');
  s = s.replace(/([^A-Za-zÀ-ÿ0-9]|^)[)\]]?n\s+(?=[a-z]{2,}@)/g, '$1');
  s = s.replace(/([^A-Za-zÀ-ÿ0-9]|^)[)\]]?n\s+(?=(linkedin|github|http|www\.))/gi, '$1');

  // 4. Normaliser les puces typographiques en "- " markdown-friendly
  s = s.replace(/^[\s]*[▸▪●►◆◾◉►•⦿◦‣⁃]\s*/gm, '- ');

  // 5. Recoller les césures de fin de ligne ("infor-\nmatique" → "informatique")
  //    On ne le fait que si le mot avant le tiret est en minuscules + suite minuscule
  s = s.replace(/([a-zà-ÿ])-\n([a-zà-ÿ])/g, '$1$2');

  // 6. Joindre les lignes qui appartiennent au même paragraphe (single-newline
  //    entre deux lignes de prose continue, sans changement de structure).
  //    Heuristique prudente : on join si la ligne suivante commence en minuscule
  //    ET que la précédente ne se termine pas par une ponctuation forte.
  s = s.replace(/([a-zà-ÿ,;])\n(?=[a-zà-ÿ])/g, '$1 ');

  // 7. Espaces multiples → 1
  s = s.replace(/[ \t]+/g, ' ');

  // 8. Espaces avant ponctuation FR (ponctuation double) : conserver une fine
  //    insécable serait l'idéal mais on simplifie en espace normal
  s = s.replace(/ +([,.;!?:])/g, '$1');
  // …puis on remet un espace après si manquant
  s = s.replace(/([,.;!?:])(?=[A-Za-zÀ-ÿ])/g, '$1 ');

  // 9. Limiter les sauts de ligne consécutifs à 2 (paragraphes)
  s = s.replace(/\n{3,}/g, '\n\n');

  // 10. Trim final
  return s.trim();
}

function countWords(s: string): number {
  if (!s) return 0;
  return s.split(/\s+/).filter(Boolean).length;
}
