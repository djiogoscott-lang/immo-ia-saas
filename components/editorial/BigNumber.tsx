/**
 * BigNumber — gros chiffre + label, modèle NAIOM p.10 ("~4 €", "~50 €", "> 97 %").
 *
 * À utiliser dans une grille de 3 colonnes pour mettre en avant l'économie
 * unitaire ou des KPIs clés.
 */

import { cn } from '@/lib/utils';

interface BigNumberProps {
  /** Valeur affichée en gros (ex: "~ 4 €", "> 97 %"). */
  value: string;
  /** Label en majuscule sous le chiffre. */
  label: string;
  className?: string;
}

export function BigNumber({ value, label, className }: BigNumberProps) {
  return (
    <div
      className={cn(
        'border border-ink-line bg-paper-soft px-6 py-8 text-left',
        className
      )}
    >
      <div className="font-display text-5xl font-extrabold tracking-display-tight text-ink sm:text-6xl">
        {value}
      </div>
      <div className="mt-3 text-[10px] font-bold uppercase leading-snug tracking-[0.22em] text-ink-muted">
        {label}
      </div>
    </div>
  );
}
