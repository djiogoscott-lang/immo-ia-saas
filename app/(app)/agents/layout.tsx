/**
 * Layout du dashboard multi-agents (`/agents/*`).
 *
 * Server component async :
 *   1. récupère le user connecté via Supabase Auth (cookies)
 *   2. récupère son profile métier (rôle, nom complet)
 *   3. passe ces infos à la Sidebar pour filtrer les agents par audience
 *      et afficher le UserMenu avec un bouton "Se déconnecter"
 *
 * Le middleware Next.js redirige déjà vers /login si pas auth — la double
 * vérification ici sert de filet de sécurité (defense in depth).
 */

import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AgentSidebar } from '@/components/agents/AgentSidebar';
import { getCurrentProfile } from '@/lib/auth/get-current-user';
import { createClient } from '@/lib/supabase/server';

interface AgentsLayoutProps {
  children: ReactNode;
}

export default async function AgentsLayout({ children }: AgentsLayoutProps) {
  // Mode démo : on bypass complètement Supabase Auth et on passe un profil
  // fictif avec rôle "manager" pour que la sidebar affiche les 12 agents.
  // ACTIVÉ PAR DÉFAUT — désactiver via DEMO_MODE=false en prod.
  if (process.env.DEMO_MODE !== 'false') {
    return (
      <div className="flex h-screen overflow-hidden bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <AgentSidebar
          userRole="manager"
          userEmail="demo@nestenn.ia"
          userFullName="Mode démo"
        />
        <main className="flex-1 overflow-y-auto" aria-label="Contenu principal">
          {children}
        </main>
      </div>
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getCurrentProfile();

  if (!profile) {
    // Cas rare : auth OK mais profile absent (trigger SQL pas joué).
    // On ne peut pas filtrer les agents sans rôle → on renvoie vers login.
    redirect('/login?error=profile_missing');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <AgentSidebar
        userRole={profile.role}
        userEmail={user.email ?? ''}
        userFullName={profile.full_name}
      />
      <main className="flex-1 overflow-y-auto" aria-label="Contenu principal">
        {children}
      </main>
    </div>
  );
}
