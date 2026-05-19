/**
 * Page /agents/files — hub global des fichiers RAG de l'utilisateur.
 *
 * Server Component : récupère la liste initiale, délègue l'UI interactive
 * (upload, delete) au composant client FilesPageClient.
 *
 * Mode démo : affiche une notice expliquant que le RAG nécessite l'auth.
 */

import { FolderOpen } from 'lucide-react';

import { FilesPageClient } from '@/components/agents/FilesPageClient';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { listAgentFiles, type AgentFile } from '@/lib/supabase/agent-files';

export const dynamic = 'force-dynamic';

export default async function FilesPage() {
  const isDemoMode = process.env.DEMO_MODE !== 'false';

  let initialFiles: AgentFile[] = [];
  let isAuthenticated = false;

  if (!isDemoMode) {
    const user = await getCurrentUser();
    if (user) {
      isAuthenticated = true;
      initialFiles = await listAgentFiles(user.id, { limit: 100 });
    }
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
            Téléverse des PDF ou DOCX (max 5 MB). Tes fichiers enrichissent
            automatiquement le contexte de tous tes agents (recherche
            sémantique RAG).
          </p>
        </div>
      </header>

      {isDemoMode || !isAuthenticated ? (
        <DemoNotice isDemoMode={isDemoMode} />
      ) : (
        <FilesPageClient initialFiles={initialFiles} />
      )}
    </div>
  );
}

function DemoNotice({ isDemoMode }: { isDemoMode: boolean }) {
  return (
    <div className="rounded-2xl border border-amber-900/40 bg-amber-950/30 p-6 text-sm">
      <p className="font-medium text-amber-200">
        {isDemoMode
          ? "L'upload de fichiers nécessite l'authentification Supabase."
          : 'Connexion requise pour gérer tes fichiers RAG.'}
      </p>
      <p className="mt-2 text-amber-300/80">
        {isDemoMode
          ? "Désactive le mode démo (DEMO_MODE=false) et applique la migration v4_agent_files.sql pour activer le RAG en local."
          : 'Reconnecte-toi via /auth pour accéder à cette page.'}
      </p>
    </div>
  );
}
