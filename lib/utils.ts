import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Concatène et déduplique des classes Tailwind.
 * Convention shadcn/ui : utilisé partout pour mélanger des classes
 * conditionnelles et statiques sans collisions.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
