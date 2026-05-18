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
  // Le visiteur peut cliquer "Connexion" ou "Créer un compte" pour explorer,
  // ou directement entrer un agent depuis la grille post-auth (auth bypassée).
  if (process.env.DEMO_MODE === 'true') {
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
