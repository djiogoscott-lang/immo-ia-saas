import { redirect } from 'next/navigation';

/**
 * Page racine `/` — redirige vers le dashboard agents.
 *
 * Quand l'auth Supabase sera branchée, cette page deviendra la landing /
 * page de login. Pour l'instant, on accède directement au dashboard.
 */
export default function HomePage() {
  redirect('/agents');
}
