/**
 * Squelette affiché instantanément pendant le chargement d'un espace agent
 * (streaming Next.js) : même structure que AgentWorkspace (header + onglets +
 * zone de chat) pour éviter tout saut de mise en page à l'arrivée du contenu.
 */
export default function AgentWorkspaceLoading() {
  return (
    <div
      className="flex h-full flex-col bg-zinc-950 text-white"
      role="status"
      aria-label="Chargement de l'agent"
    >
      <header className="border-b border-white/10 px-6 pt-5">
        <div className="flex animate-pulse items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-56 rounded bg-white/10" />
            <div className="h-3 w-80 max-w-full rounded bg-white/5" />
          </div>
        </div>
        <div className="mt-4 flex animate-pulse gap-4 pb-3">
          <div className="h-6 w-16 rounded bg-white/10" />
          <div className="h-6 w-20 rounded bg-white/5" />
          <div className="h-6 w-20 rounded bg-white/5" />
        </div>
      </header>

      <div className="flex flex-1 animate-pulse flex-col justify-end gap-4 p-6">
        <div className="h-16 w-2/3 rounded-2xl bg-white/5" />
        <div className="ml-auto h-10 w-1/2 rounded-2xl bg-white/10" />
        <div className="h-12 w-full rounded-xl border border-white/10 bg-white/5" />
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
