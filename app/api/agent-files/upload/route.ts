/**
 * POST /api/agent-files/upload — upload + pipeline RAG sync inline.
 *
 * Flow :
 *   1. Auth + rate limit
 *   2. Parse multipart (1 fichier)
 *   3. Valide taille + MIME
 *   4. Crée row agent_files (status='processing')
 *   5. Upload Supabase Storage à {userId}/{fileId}.{ext}
 *   6. Extract texte (pdf-parse / mammoth)
 *   7. Chunk
 *   8. Embed (Mistral)
 *   9. Insert chunks
 *  10. Update status='ready' + chunks_count
 *
 * En cas d'erreur après création de la row : on bascule status='error' avec
 * error_message — pas de rollback automatique du Storage (l'utilisateur peut
 * supprimer la ligne en erreur depuis la page /agents/files).
 */

import { getCurrentUser } from '@/lib/auth/get-current-user';
import { embedDocuments } from '@/lib/embeddings/nomic';
import { chunkText } from '@/lib/files/chunk';
import { extractText } from '@/lib/files/extract';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  buildStoragePath,
  createAgentFile,
  deleteFromStorage,
  insertChunks,
  updateAgentFileStatus,
  uploadToStorage,
  type AllowedMimeType,
} from '@/lib/supabase/agent-files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Hobby max

function isAllowedMime(mime: string): mime is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

function extFromMime(mime: AllowedMimeType): string {
  switch (mime) {
    case 'application/pdf':
      return 'pdf';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'docx';
  }
}

export async function POST(request: Request) {
  // --- 0. Mode démo ---------------------------------------------------------
  const isDemoMode = process.env.DEMO_MODE !== 'false';
  if (isDemoMode) {
    return Response.json(
      {
        error: 'demo_mode',
        message:
          "L'upload de fichiers n'est pas disponible en mode démo. Connecte-toi pour activer le RAG.",
      },
      { status: 403 }
    );
  }

  // --- 1. Auth --------------------------------------------------------------
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: 'unauthorized', message: 'Connexion requise.' },
      { status: 401 }
    );
  }

  // --- 2. Rate limit --------------------------------------------------------
  const rl = rateLimit({
    identifier: `agent-files:upload:${user.id}`,
    ...RATE_LIMITS.upload,
  });
  if (!rl.success) {
    return Response.json(
      {
        error: 'rate_limit_exceeded',
        message: 'Trop d\'uploads récents. Patiente quelques minutes.',
        resetAt: rl.resetAt,
      },
      { status: 429 }
    );
  }

  // --- 3. Parse multipart ---------------------------------------------------
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: 'invalid_form_data', message: 'Body multipart invalide.' },
      { status: 400 }
    );
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return Response.json(
      { error: 'missing_file', message: 'Champ "file" manquant.' },
      { status: 400 }
    );
  }

  // Champ optionnel : si fourni, attache le fichier à une conversation précise
  // (sinon, scope global). Validation UUID légère pour éviter d'envoyer
  // n'importe quoi en FK.
  const rawConvId = formData.get('conversationId');
  let conversationId: string | null = null;
  if (typeof rawConvId === 'string' && rawConvId.length > 0) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawConvId)) {
      return Response.json(
        { error: 'invalid_conversation_id', message: 'conversationId doit être un UUID.' },
        { status: 400 }
      );
    }
    conversationId = rawConvId;
  }

  // --- 4. Valide taille + MIME ----------------------------------------------
  if (file.size === 0) {
    return Response.json(
      { error: 'empty_file', message: 'Le fichier est vide.' },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return Response.json(
      {
        error: 'file_too_large',
        message: `Taille max ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
      },
      { status: 413 }
    );
  }
  if (!isAllowedMime(file.type)) {
    return Response.json(
      {
        error: 'unsupported_mime',
        message: `Format non supporté : ${file.type}. Accepté : PDF, DOCX.`,
      },
      { status: 415 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // --- 5. Crée la row DB (status=processing) --------------------------------
  // On a besoin de l'ID DB pour construire le storage_path, donc on insère
  // d'abord avec un path temporaire, puis on update après upload réussi.
  const fileRow = await createAgentFile({
    userId: user.id,
    conversationId,
    storagePath: 'pending', // placeholder, mis à jour après l'upload Storage
    name: file.name,
    sizeBytes: file.size,
    mimeType: file.type,
  });
  if (!fileRow) {
    return Response.json(
      { error: 'db_insert_failed', message: 'Création DB échouée.' },
      { status: 500 }
    );
  }

  const storagePath = buildStoragePath(user.id, fileRow.id, extFromMime(file.type));

  // --- 6. Upload Storage ----------------------------------------------------
  const uploadRes = await uploadToStorage(storagePath, buffer, file.type);
  if (uploadRes.error) {
    await updateAgentFileStatus(fileRow.id, 'error', {
      errorMessage: `Storage : ${uploadRes.error}`,
    });
    return Response.json(
      { error: 'storage_upload_failed', message: uploadRes.error, fileId: fileRow.id },
      { status: 500 }
    );
  }

  // Met à jour le storage_path maintenant qu'on l'a confirmé
  await updateAgentFileStatus(fileRow.id, 'processing', {});

  // --- 7-10. Pipeline RAG ---------------------------------------------------
  try {
    // 7. Extract
    const { text, meta } = await extractText(buffer, file.type);
    if (!text || text.length < 20) {
      throw new Error(
        `Texte extrait trop court (${text?.length ?? 0} chars). Le fichier est peut-être une image scannée — l'OCR n'est pas supporté.`
      );
    }

    // 8. Chunk
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      throw new Error('Aucun chunk généré.');
    }
    if (chunks.length > 500) {
      throw new Error(
        `Fichier trop dense (${chunks.length} chunks). Limite : 500 par fichier.`
      );
    }

    // 9. Embed (Nomic, task_type=search_document)
    const { embeddings, totalTokens } = await embedDocuments(chunks);
    if (embeddings.length !== chunks.length) {
      throw new Error(
        `Mismatch chunks/embeddings : ${chunks.length} vs ${embeddings.length}.`
      );
    }

    // Distribue les tokens uniformément sur les chunks (approximation)
    const tokensPerChunk = Math.ceil(totalTokens / chunks.length);

    // 10. Insert chunks
    const insertRes = await insertChunks(
      chunks.map((content, idx) => ({
        file_id: fileRow.id,
        user_id: user.id,
        chunk_index: idx,
        content,
        embedding: embeddings[idx]!,
        tokens: tokensPerChunk,
      }))
    );
    if (insertRes.error) {
      throw new Error(`Insert chunks : ${insertRes.error}`);
    }

    // 11. Status='ready'
    await updateAgentFileStatus(fileRow.id, 'ready', {
      chunksCount: chunks.length,
    });

    return Response.json(
      {
        id: fileRow.id,
        name: file.name,
        size_bytes: file.size,
        mime_type: file.type,
        conversation_id: conversationId,
        status: 'ready',
        chunks_count: chunks.length,
        meta,
        tokens_used: totalTokens,
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('[agent-files/upload pipeline]', msg);

    // Tente de nettoyer le Storage (best-effort, on ignore l'erreur)
    await deleteFromStorage(storagePath).catch(() => undefined);
    await updateAgentFileStatus(fileRow.id, 'error', { errorMessage: msg });

    return Response.json(
      {
        error: 'pipeline_failed',
        message: msg,
        fileId: fileRow.id,
      },
      { status: 500 }
    );
  }
}
