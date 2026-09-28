/**
 * Squelette affiché instantanément pendant le chargement des pages /agents
 * (grille, bibliothèque, fichiers) : la sidebar du layout reste en place,
 * seule la zone principale affiche ce placeholder.
 */
export default function AgentsLoading() {
  return (
    <div
      className="min-h-full bg-zinc-950 px-6 py-12 lg:px-10 lg:py-16"
      role="status"
      aria-label="Chargement"
    >
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="mb-3 h-3 w-40 rounded bg-white/10" />
        <div className="mb-4 h-9 w-80 max-w-full rounded bg-white/10" />
        <div className="mb-10 h-4 w-96 max-w-full rounded bg-white/5" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-36 rounded-2xl border border-white/10 bg-white/5" />
          ))}
        </div>
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
