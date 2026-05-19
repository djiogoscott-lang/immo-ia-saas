'use client';

/**
 * SaveDeliverableButton — bouton "📌 Sauvegarder en livrable" affiché sous
 * un message d'agent. Au clic, déploie un mini-formulaire inline pour
 * saisir le type, le slug et la campagne, puis POST /api/deliverables.
 *
 * En mode démo, désactivé avec tooltip "Connecte-toi pour archiver".
 */

import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, Check, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { AgentId } from '@/lib/agents/registry';
import { cn } from '@/lib/utils';

interface SaveDeliverableButtonProps {
  agentId: AgentId;
  markdownBody: string;
  promptSource?: string;
  conversationId?: string;
  modelUsed?: string;
}

type SaveState = 'idle' | 'form' | 'saving' | 'saved';

const DEFAULT_TYPES = [
  'annonce',
  'post-reseaux',
  'mail',
  'sms',
  'consultation-juridique',
  'simulation-financiere',
  'analyse-dpe',
  'autre',
];

export function SaveDeliverableButton({
  agentId,
  markdownBody,
  promptSource,
  conversationId,
  modelUsed,
}: SaveDeliverableButtonProps) {
  const [state, setState] = useState<SaveState>('idle');
  const [type, setType] = useState(DEFAULT_TYPES[0]);
  const [slug, setSlug] = useState(generateAutoSlug(promptSource ?? agentId));
  const [campagne, setCampagne] = useState('');

  const handleOpen = () => {
    setState('form');
    setSlug(generateAutoSlug(promptSource ?? agentId));
  };

  const handleCancel = () => {
    setState('idle');
  };

  const handleSave = async () => {
    if (!type.trim() || !slug.trim()) {
      toast.error('Type et slug sont obligatoires.');
      return;
    }
    setState('saving');
    try {
      const response = await fetch('/api/deliverables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          type: type.trim(),
          slug: slug.trim(),
          markdownBody,
          campagne: campagne.trim() || undefined,
          conversationId,
          modelUsed,
          promptSource,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message ?? `Erreur ${response.status}`
        );
      }

      setState('saved');
      toast.success('Livrable archivé', {
        description: `Type "${type}" · slug "${slug}"`,
      });
      // Reset après 2s
      setTimeout(() => setState('idle'), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error('Sauvegarde impossible', { description: message });
      setState('form');
    }
  };

  if (state === 'idle') {
    return (
      <button
        type="button"
        onClick={handleOpen}
        title="Sauvegarder ce message en livrable archivé"
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100/80 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
      >
        <Bookmark className="h-3.5 w-3.5" aria-hidden />
        <span>Sauvegarder</span>
      </button>
    );
  }

  if (state === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        <Check className="h-3.5 w-3.5" aria-hidden />
        Archivé
      </span>
    );
  }

  // state === 'form' || 'saving'
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="mt-2 overflow-hidden rounded-lg border border-zinc-200 bg-white/80 p-3 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Archiver ce livrable
          </span>
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Annuler"
            className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
              Type
            </span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={state === 'saving'}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {DEFAULT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
              Slug
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              disabled={state === 'saving'}
              placeholder="appt-t3-nice"
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 font-mono text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
              Campagne (optionnelle)
            </span>
            <input
              type="text"
              value={campagne}
              onChange={(e) => setCampagne(e.target.value)}
              disabled={state === 'saving'}
              placeholder="vente-villa-cap"
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={state === 'saving'}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={state === 'saving' || !slug.trim()}
            className={cn(
              'flex items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700',
              'disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700'
            )}
          >
            {state === 'saving' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Archivage…
              </>
            ) : (
              <>
                <Bookmark className="h-3.5 w-3.5" aria-hidden />
                Archiver
              </>
            )}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Génère un slug auto à partir du prompt source (ou fallback agent + date). */
function generateAutoSlug(source: string): string {
  const cleaned = source
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const ts = new Date().toISOString().slice(0, 10);
  return cleaned ? `${cleaned}-${ts}` : `livrable-${ts}`;
}
