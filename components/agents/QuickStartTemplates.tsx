'use client';

/**
 * QuickStartTemplates — 3 cartes cliquables affichées dans la zone chat
 * tant qu'aucun message n'a été échangé, pour éviter le syndrome de la
 * page blanche.
 *
 * Reçoit `onSelect(prompt)` : quand l'utilisateur clique une carte, le
 * texte du prompt est injecté dans l'input du chat (sans soumettre
 * automatiquement, pour laisser le user le personnaliser avant envoi).
 */

import { Sparkles } from 'lucide-react';

import { getTemplatesForAgent } from '@/lib/agents/templates';
import type { AgentId } from '@/lib/agents/registry';

interface QuickStartTemplatesProps {
  agentId: AgentId;
  onSelect: (prompt: string) => void;
}

export function QuickStartTemplates({
  agentId,
  onSelect,
}: QuickStartTemplatesProps) {
  const templates = getTemplatesForAgent(agentId);
  if (templates.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Démarrage rapide
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {templates.map((template, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(template.prompt)}
            className="group flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700 dark:focus:ring-offset-zinc-950"
          >
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Suggestion {idx + 1}
              </span>
            </div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {template.title}
            </p>
            <p className="line-clamp-2 text-xs text-zinc-500 transition-colors group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-300">
              {template.prompt}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
