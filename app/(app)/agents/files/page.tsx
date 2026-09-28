/**
 * Page /agents/files — hub global des fichiers RAG de l'utilisateur.
 *
 * Server Component : récupère la liste initiale, délègue l'UI interactive
 * (upload, delete) au composant client FilesPageClient.
 */

import { FolderOpen } from 'lucide-react';

import { FilesPageClient } from '@/components/agents/FilesPageClient';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { listAgentFiles, type AgentFile } from '@/lib/supabase/agent-files';

export const dynamic = 'force-dynamic';

export default async function FilesPage() {
  let initialFiles: AgentFile[] = [];

  const user = await getCurrentUser();
  if (user) {
    // conversationId: null → uniquement le pool global (les fichiers attachés
    // à une conversation précise sont gérés dans /agents/[id] directement).
    initialFiles = await listAgentFiles(user.id, { limit: 100, conversationId: null });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
      {/* Header */}
      <header className="mb-8 flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-900/30 text-cyan-300 ring-1 ring-cyan-900/50"
        >
          <FolderOpen className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
            Mes fichiers
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Pool global : ces fichiers sont accessibles à <strong>tous tes agents
            dans toutes tes conversations</strong>. Pour un fichier ponctuel
            (rattaché à une seule discussion), utilise plutôt le bouton trombone
            dans le chat de l'agent.
          </p>
        </div>
      </header>

      {user ? (
        <FilesPageClient initialFiles={initialFiles} />
      ) : (
        <div className="rounded-2xl border border-amber-900/40 bg-amber-950/30 p-6 text-sm">
          <p className="font-medium text-amber-200">
            Connexion requise pour gérer tes fichiers RAG.
          </p>
        </div>
      )}
    </div>
  );
}
