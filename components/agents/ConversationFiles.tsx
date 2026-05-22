'use client';

/**
 * ConversationFiles — gère les fichiers attachés à UNE conversation.
 *
 * Affichage : chips en haut du composer (input chat).
 * Interactions :
 *   - Bouton trombone → ouvre un file picker
 *   - Drag-and-drop sur la zone englobante (activée par la prop `dropZoneRef`)
 *   - Click X sur un chip → suppression du fichier (DELETE /api/agent-files/{id})
 *
 * Au mount :
 *   - Si `conversationId` fourni, fetch les fichiers déjà attachés
 *   - Sinon, état initial vide (les fichiers seront attachés une fois la conv créée)
 *
 * Limitation actuelle : un upload nécessite un conversationId. Si l'utilisateur
 * tente d'attacher un fichier avant le premier message (donc avant la création
 * de la conversation), l'UI lui demande d'envoyer au moins un message d'abord.
 */

import { Paperclip, X, FileText, Loader2, AlertCircle } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FileStatus = 'uploading' | 'processing' | 'ready' | 'error';

export interface AttachedFile {
  /** UUID en base. Pour les uploads en cours, on utilise un id temporaire local. */
  id: string;
  name: string;
  size_bytes: number;
  status: FileStatus;
  /** Erreur d'upload/pipeline si status === 'error'. */
  errorMessage?: string;
}

/** Handle exposé au parent pour déclencher un upload depuis l'extérieur (drop). */
export interface ConversationFilesHandle {
  openFilePicker: () => void;
  uploadFiles: (files: FileList | File[]) => void;
}

interface ConversationFilesProps {
  /** ID de la conversation. Null tant que le 1er message n'a pas été envoyé. */
  conversationId: string | null;
  className?: string;
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export const ConversationFiles = forwardRef<
  ConversationFilesHandle,
  ConversationFilesProps
>(function ConversationFiles({ conversationId, className }, ref) {
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ---- Charge les fichiers existants au mount / changement de conv -------
  useEffect(() => {
    if (!conversationId) {
      setFiles([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/agent-files?conversationId=${encodeURIComponent(conversationId)}`,
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { files?: Array<{ id: string; name: string; size_bytes: number; status: FileStatus }> };
        if (cancelled) return;
        setFiles(
          (data.files ?? []).map((f) => ({
            id: f.id,
            name: f.name,
            size_bytes: f.size_bytes,
            status: f.status,
          }))
        );
      } catch (err) {
        console.warn('[ConversationFiles] fetch initial échoué :', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // ---- Upload d'un fichier ------------------------------------------------
  const uploadSingle = useCallback(
    async (file: File): Promise<void> => {
      if (!conversationId) {
        toast.error('Envoie un premier message avant d\'attacher des fichiers.');
        return;
      }

      const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const temp: AttachedFile = {
        id: tempId,
        name: file.name,
        size_bytes: file.size,
        status: 'uploading',
      };
      setFiles((prev) => [...prev, temp]);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('conversationId', conversationId);

        const res = await fetch('/api/agent-files/upload', {
          method: 'POST',
          body: formData,
        });

        const payload = (await res.json()) as
          | { id: string; status: FileStatus; chunks_count?: number }
          | { error: string; message: string };

        if (!res.ok || 'error' in payload) {
          const msg =
            'message' in payload ? payload.message : `HTTP ${res.status}`;
          setFiles((prev) =>
            prev.map((f) =>
              f.id === tempId
                ? { ...f, status: 'error', errorMessage: msg }
                : f
            )
          );
          toast.error(`Upload échoué : ${file.name}`, { description: msg });
          return;
        }

        // Remplace le temp par la vraie row DB
        setFiles((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? {
                  id: payload.id,
                  name: file.name,
                  size_bytes: file.size,
                  status: payload.status,
                }
              : f
          )
        );
        toast.success(`${file.name} ajouté à la conversation`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur réseau';
        setFiles((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? { ...f, status: 'error', errorMessage: msg }
              : f
          )
        );
        toast.error(`Upload échoué : ${file.name}`, { description: msg });
      }
    },
    [conversationId]
  );

  const uploadFiles = useCallback(
    (incoming: FileList | File[]) => {
      const list = Array.from(incoming);
      for (const file of list) {
        void uploadSingle(file);
      }
    },
    [uploadSingle]
  );

  // ---- Suppression d'un fichier ------------------------------------------
  const removeFile = useCallback(async (fileId: string) => {
    // Optimistic UI : on retire immédiatement
    const previous = files;
    setFiles((prev) => prev.filter((f) => f.id !== fileId));

    // Si c'est un upload en cours (tempId), pas d'appel API
    if (fileId.startsWith('tmp_')) return;

    try {
      const res = await fetch(`/api/agent-files/${fileId}`, { method: 'DELETE' });
      if (!res.ok) {
        // Rollback
        setFiles(previous);
        toast.error('Suppression échouée');
      }
    } catch {
      setFiles(previous);
      toast.error('Suppression échouée (réseau)');
    }
  }, [files]);

  // ---- Handle pour le parent ---------------------------------------------
  useImperativeHandle(
    ref,
    () => ({
      openFilePicker: () => fileInputRef.current?.click(),
      uploadFiles,
    }),
    [uploadFiles]
  );

  // ---- Rendu --------------------------------------------------------------
  if (files.length === 0) {
    // Input file caché toujours présent (le bouton trombone d'AgentChat
    // appelle openFilePicker() via le ref).
    return (
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            uploadFiles(e.target.files);
            e.target.value = ''; // reset pour permettre de re-sélectionner le même fichier
          }
        }}
      />
    );
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            uploadFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {files.map((file) => (
        <FileChip key={file.id} file={file} onRemove={() => removeFile(file.id)} />
      ))}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Sous-composant : chip d'un fichier
// ---------------------------------------------------------------------------

interface FileChipProps {
  file: AttachedFile;
  onRemove: () => void;
}

function FileChip({ file, onRemove }: FileChipProps) {
  const sizeKB = Math.round(file.size_bytes / 1024);
  const isError = file.status === 'error';
  const isLoading = file.status === 'uploading' || file.status === 'processing';

  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs',
        isError
          ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300'
          : 'border-slate-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'
      )}
      title={isError ? file.errorMessage : `${file.name} (${sizeKB} Ko)`}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-cyan-600 dark:text-cyan-400" aria-hidden />
      ) : isError ? (
        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : (
        <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
      )}

      <span className="max-w-[180px] truncate font-medium">{file.name}</span>
      <span className="text-[10px] text-zinc-400">{sizeKB} Ko</span>

      <button
        type="button"
        onClick={onRemove}
        className="ml-1 rounded p-0.5 text-zinc-400 transition-colors hover:bg-slate-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        aria-label={`Retirer ${file.name}`}
      >
        <X className="h-3 w-3" aria-hidden />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bouton trombone — à placer à côté du textarea de l'input chat
// ---------------------------------------------------------------------------

interface AttachButtonProps {
  onClick: () => void;
}

export function AttachButton({ onClick }: AttachButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-xl border border-slate-300 bg-white p-2.5 text-zinc-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      aria-label="Joindre un fichier (PDF ou DOCX, max 5 Mo)"
      title="Joindre un fichier (PDF, DOCX, max 5 Mo)"
    >
      <Paperclip className="h-4 w-4" aria-hidden />
    </button>
  );
}
