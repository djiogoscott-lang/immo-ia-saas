/**
 * EditorialCard — carte agent style NAIOM (p.5-7).
 *
 * Layout : avatar rond à gauche + zone texte à droite. Header avec nom +
 * micro-label modèle/rôle, puis description, puis listes de frameworks/
 * livrables/outils.
 *
 * Volontairement neutre (border + bg-paper) pour rester sobre. La couleur
 * d'accent n'est appliquée que sur le label modèle (uppercase).
 */

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface EditorialCardProps {
  /** Slot avatar (typiquement <AgentAvatar size="lg" status={null} />). */
  avatar: ReactNode;
  /** Nom affiché en titre (ex: "Le Stratège"). */
  name: string;
  /** Méta en majuscule (ex: "CLAUDE OPUS · BRIEFS & ICP"). */
  meta?: string;
  /** Paragraphe descriptif. */
  description: ReactNode;
  /** Liste optionnelle clé/valeur (Frameworks, Livrable, Outils, etc.). */
  details?: Array<{ label: string; value: ReactNode }>;
  className?: string;
}

export function EditorialCard({
  avatar,
  name,
  meta,
  description,
  details,
  className,
}: EditorialCardProps) {
  return (
    <article
      className={cn(
        'flex gap-6 border border-ink-line bg-paper p-6 sm:p-7',
        className
      )}
    >
      <div className="shrink-0">{avatar}</div>

      <div className="min-w-0 flex-1">
        <h3 className="font-display text-2xl font-extrabold tracking-display-tight text-ink">
          {name}
        </h3>

        {meta && (
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            {meta}
          </div>
        )}

        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{description}</p>

        {details && details.length > 0 && (
          <dl className="mt-4 space-y-1.5 text-xs leading-relaxed text-ink-soft">
            {details.map((d) => (
              <div key={d.label} className="flex flex-wrap gap-x-2">
                <dt className="font-semibold text-ink">{d.label} :</dt>
                <dd className="min-w-0 flex-1">{d.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </article>
  );
}
