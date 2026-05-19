'use client';

/**
 * FilesPageClient — gestion interactive des fichiers RAG (upload + liste + delete).
 *
 * - Drop zone (drag & drop ou bouton input file)
 * - Upload séquentiel (un fichier à la fois pour rester sous le budget 60s Vercel)
 * - Liste live avec badge status (processing / ready / error)
 * - Delete avec confirmation toast
 *
 * Pas de polling : la page utilise force-dynamic, refresh manuel ou navigation
 * pour voir les nouveaux fichiers (le upload sync inline retourne le statut
 * final donc on n'a pas vraiment besoin de polling).
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import type { AgentFile } from '@/lib/supabase/agent-files';
import { cn } from '@/lib/utils';

interface FilesPageClientProps {
  initialFiles: AgentFile[];
}

export function FilesPageClient({ initialFiles }: FilesPageClientProps) {
  const [files, setFiles] = useState<AgentFile[]>(initialFiles);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  // -------------------------------------------------------------------------
  // Upload séquentiel d'une liste de fichiers
  // -------------------------------------------------------------------------
  const handleFiles = async (incoming: FileList | File[]) => {
    const list = Array.from(incoming);
    if (list.length === 0) return;
    setUploading(true);

    for (const file of list) {
      const formData = new FormData();
      formData.append('file', file);

      toast.loading(`Upload de ${file.name}…`, { id: file.name });

      try {
        const res = await fetch('/api/agent-files/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (!res.ok) {
          toast.error(`Échec : ${file.name}`, {
            id: file.name,
            description: data.message ?? 'Erreur inconnue',
          });
          continue;
        }

        toast.success(`${file.name} indexé`, {
          id: file.name,
          description: `${data.chunks_count} chunks · ${data.tokens_used} tokens`,
        });

        // Insère en tête de liste avec les infos retournées
        setFiles((prev) => [
          {
            id: data.id,
            user_id: '',
            storage_path: '',
            name: data.name,
            size_bytes: data.size_bytes,
            mime_type: data.mime_type,
            status: 'ready',
            error_message: null,
            chunks_count: data.chunks_count,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      } catch (err) {
        toast.error(`Échec : ${file.name}`, {
          id: file.name,
          description: err instanceof Error ? err.message : 'Erreur réseau',
        });
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  // -------------------------------------------------------------------------
  // Delete avec confirmation toast
  // -------------------------------------------------------------------------
  const handleDelete = (fileId: string, fileName: string) => {
    if (!confirm(`Supprimer "${fileName}" et ses chunks indexés ?`)) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/agent-files/${fileId}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error('Suppression impossible', {
            description: data.message ?? `HTTP ${res.status}`,
          });
          return;
        }
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        toast.success(`${fileName} supprimé`);
      } catch (err) {
        toast.error('Suppression impossible', {
          description: err instanceof Error ? err.message : 'Erreur réseau',
        });
      }
    });
  };

  return (
    <>
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (uploading) return;
          if (e.dataTransfer.files.length > 0) {
            void handleFiles(e.dataTransfer.files);
          }
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors',
          isDragging
            ? 'border-cyan-500 bg-cyan-900/20'
            : 'border-zinc-700 bg-zinc-900/40',
          uploading && 'opacity-60'
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-cyan-300 shadow-sm">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <Upload className="h-5 w-5" aria-hidden />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-50">
            {uploading ? 'Indexation en cours…' : 'Glisse tes fichiers ici'}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            PDF, DOCX · max 5 Mo par fichier
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Parcourir mes fichiers
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              void handleFiles(e.target.files);
            }
          }}
        />
      </div>

      {/* Liste */}
      <div className="mt-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
          {files.length === 0
            ? 'Aucun fichier indexé'
            : `${files.length} fichier${files.length > 1 ? 's' : ''} indexé${
                files.length > 1 ? 's' : ''
              }`}
        </h2>

        <AnimatePresence initial={false}>
          <ul className="space-y-2">
            {files.map((file) => (
              <motion.li
                key={file.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
              >
                <FileRow file={file} onDelete={handleDelete} />
              </motion.li>
            ))}
          </ul>
        </AnimatePresence>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sous-composant : une ligne de fichier
// ---------------------------------------------------------------------------

interface FileRowProps {
  file: AgentFile;
  onDelete: (fileId: string, fileName: string) => void;
}

function FileRow({ file, onDelete }: FileRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 backdrop-blur-sm transition-colors hover:border-zinc-700">
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300"
      >
        <FileText className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-zinc-50">{file.name}</p>
          <StatusBadge status={file.status} />
        </div>
        <p className="mt-0.5 text-[11px] text-zinc-500">
          {formatSize(file.size_bytes)}
          {file.chunks_count > 0 && ` · ${file.chunks_count} chunks`}
          {' · '}
          {formatDate(file.created_at)}
        </p>
        {file.error_message && (
          <p className="mt-1 text-[11px] text-rose-400">{file.error_message}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDelete(file.id, file.name)}
        aria-label={`Supprimer ${file.name}`}
        title="Supprimer"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-rose-900/30 hover:text-rose-300"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: AgentFile['status'] }) {
  switch (status) {
    case 'ready':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/40 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
          <CheckCircle2 className="h-2.5 w-2.5" aria-hidden />
          indexé
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/40 px-2 py-0.5 text-[10px] font-medium text-amber-300">
          <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden />
          indexation
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-950/40 px-2 py-0.5 text-[10px] font-medium text-rose-300">
          <AlertCircle className="h-2.5 w-2.5" aria-hidden />
          erreur
        </span>
      );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH} h`;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
