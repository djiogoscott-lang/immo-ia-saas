import 'server-only';

/**
 * OCR pour PDFs scannés / image-based via un modèle vision Mistral
 * (Mistral Large 3, mistralai/mistral-large-2512, multimodal) accessible via
 * OpenRouter. Pixtral Large 2411, utilisé à l'origine, a été retiré du catalogue.
 *
 * Flow :
 *   1. PDF -> images PNG (1 par page) via pdf-to-png-converter (pur JS)
 *   2. Chaque image envoyée à Pixtral en format messages[0].content image_url base64
 *   3. Prompt : "extrais TOUT le texte visible, conserve la structure"
 *   4. Concaténation des pages dans l'ordre, séparateur "\n\n--- PAGE N ---\n\n"
 *
 * Garde-fous :
 *   - Limite à MAX_PAGES (10) pour rester sous le timeout Vercel 60s
 *   - Skip silencieux si OPENROUTER_API_KEY manquant
 *   - Robuste : si Pixtral échoue sur 1 page, on continue avec les autres
 *
 * Coût indicatif : ~$0.003 par page (image ~1500 input tokens + ~500 output).
 */

import { pdfToPng } from 'pdf-to-png-converter';

import { APP_NAME } from '@/lib/branding';

const VISION_MODEL = 'mistralai/mistral-large-2512';
const MAX_PAGES = 10;
const TIMEOUT_PER_PAGE_MS = 30_000;

export interface OcrResult {
  /** Texte concaténé de toutes les pages OCR. */
  text: string;
  /** Nombre de pages traitées (peut être < total si limite). */
  pagesProcessed: number;
  /** Nombre total de pages du PDF (avant limite). */
  totalPages: number;
  /** True si au moins une page a été tronquée à cause de MAX_PAGES. */
  truncated: boolean;
  /** Erreurs par page (clé = numéro de page 1-based). */
  errors: Record<number, string>;
}

const OCR_SYSTEM_PROMPT = `Tu es un expert OCR. Ta mission : extraire TOUT le texte visible dans l'image.

RÈGLES STRICTES :
1. Restitue le texte FIDÈLEMENT, sans rien inventer ni omettre.
2. Conserve la structure : titres, listes, tableaux (utilise le format Markdown).
3. Pour un tableau, reproduis chaque ligne et chaque cellule. Si une cellule contient un chiffre, restitue le chiffre exact (ex: 12,71 et non 12.71 si la virgule française est utilisée).
4. Ignore les éléments purement décoratifs (logos, illustrations sans texte).
5. Si l'image ne contient AUCUN texte lisible, réponds uniquement par : NO_TEXT_FOUND
6. NE COMMENTE PAS, n'ajoute aucune introduction ni conclusion. Renvoie SEULEMENT le texte extrait.`;

const OCR_USER_PROMPT = `Extrais tout le texte visible dans cette image en suivant les règles.`;

/**
 * OCR un PDF complet via Pixtral. Retourne un texte concaténé prêt à chunker.
 *
 * @throws si OPENROUTER_API_KEY manquant
 */
export async function ocrPdfWithPixtral(pdfBuffer: Buffer): Promise<OcrResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY manquant — OCR Pixtral impossible.');
  }

  // 1. PDF -> images PNG (1 par page)
  // viewportScale=2 donne un rendu ~150 DPI (équivalent scan correct, lisible par Pixtral)
  const allPages = await pdfToPng(pdfBuffer, {
    viewportScale: 2,
    // Pas de disableFontFace : on garde le rendu fidèle au PDF
  });

  const totalPages = allPages.length;
  const pages = allPages.slice(0, MAX_PAGES);
  const truncated = totalPages > MAX_PAGES;

  const pageTexts: string[] = [];
  const errors: Record<number, string> = {};

  // 2. Pour chaque image -> appel Pixtral
  for (let i = 0; i < pages.length; i++) {
    const pageNum = i + 1;
    const image = pages[i];
    if (!image?.content) {
      errors[pageNum] = 'Image de page introuvable';
      continue;
    }

    try {
      const text = await ocrSingleImage(image.content, apiKey, pageNum);
      if (text && text.trim() !== 'NO_TEXT_FOUND') {
        pageTexts.push(`--- PAGE ${pageNum} ---\n\n${text.trim()}`);
      } else {
        pageTexts.push(`--- PAGE ${pageNum} ---\n\n(page sans texte detecte)`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur OCR inconnue';
      errors[pageNum] = msg;
      console.warn(`[ocr] page ${pageNum} echec: ${msg}`);
      pageTexts.push(`--- PAGE ${pageNum} ---\n\n(echec OCR : ${msg})`);
    }
  }

  return {
    text: pageTexts.join('\n\n'),
    pagesProcessed: pages.length,
    totalPages,
    truncated,
    errors,
  };
}

/**
 * Appelle Pixtral Large via OpenRouter avec une image PNG en base64.
 * Format message multimodal conforme à l'API OpenAI (acceptée par OpenRouter).
 */
async function ocrSingleImage(
  pngBuffer: Buffer,
  apiKey: string,
  pageNum: number
): Promise<string> {
  const base64 = pngBuffer.toString('base64');
  const dataUrl = `data:image/png;base64,${base64}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_PER_PAGE_MS);

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        'X-Title': `${APP_NAME} - OCR`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: 'system',
            content: OCR_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: OCR_USER_PROMPT },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.1, // déterminisme max
        max_tokens: 4000,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenRouter ${res.status} (page ${pageNum}): ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('Reponse Pixtral vide');
    }
    return text;
  } finally {
    clearTimeout(timeoutId);
  }
}
