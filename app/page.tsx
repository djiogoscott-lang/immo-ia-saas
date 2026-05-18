/**
 * Page racine `/`.
 *
 * - Si l'utilisateur est connecté → redirige vers le dashboard `/agents`
 * - Sinon → affiche la landing page publique (présentation produit + CTAs)
 */

import { redirect } from 'next/navigation';

import { LandingPage } from '@/components/landing/LandingPage';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  // Mode démo : pas d'auth, on affiche directement la landing publique.
  // ACTIVÉ PAR DÉFAUT — désactiver via DEMO_MODE=false en prod.
  if (process.env.DEMO_MODE !== 'false') {
    return <LandingPage />;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/agents');
  }

  return <LandingPage />;
}
