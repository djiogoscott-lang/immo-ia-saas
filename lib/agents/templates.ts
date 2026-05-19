/**
 * Templates de démarrage rapide ("quick-start prompts") par agent.
 *
 * Affichés sur la page de chat tant qu'aucun message n'a été échangé,
 * pour aider l'utilisateur à formuler sa première demande et éviter
 * le syndrome de la page blanche.
 *
 * Conventions :
 *   - 3 templates max par agent (densité visuelle raisonnable)
 *   - Phrases courtes, à la première personne, orientées action
 *   - Couvrent différentes facettes du cas d'usage de l'agent
 */

import type { AgentId } from './registry';

export interface QuickStartTemplate {
  /** Titre court affiché en haut de la carte (max ~40 caractères). */
  title: string;
  /** Texte injecté tel quel dans l'input quand l'utilisateur clique. */
  prompt: string;
}

export const QUICK_START_TEMPLATES: Record<AgentId, QuickStartTemplate[]> = {
  // ==========================================================================
  // Tier 1 — 8 personas Limova
  // ==========================================================================

  charly: [
    {
      title: "Découvrir l'équipe",
      prompt: "Présente-moi rapidement les agents disponibles et ce que chacun sait faire.",
    },
    {
      title: 'Trouver le bon expert',
      prompt: "J'ai besoin d'aide pour [décris ton besoin] — vers quel agent dois-je me tourner ?",
    },
    {
      title: 'Question généraliste',
      prompt: "Comment fonctionne la plateforme et combien d'agents puis-je solliciter par jour ?",
    },
  ],

  tom: [
    {
      title: 'Script de relance vendeur',
      prompt: "Mon vendeur ne donne plus de nouvelles depuis 2 semaines après la signature du mandat. Rédige-moi un script d'appel pour le relancer sans paraître insistant.",
    },
    {
      title: 'SMS de confirmation RDV',
      prompt: "Prépare-moi un SMS de confirmation de RDV vendeur pour demain 14h, court et chaleureux.",
    },
    {
      title: "Gérer l'objection « c'est trop cher »",
      prompt: "L'acheteur me dit que mon mandat est trop cher par rapport à la concurrence. Donne-moi un plan de réponse structuré pour l'appel.",
    },
  ],

  john: [
    {
      title: 'Post LinkedIn nouveau mandat',
      prompt: "Crée un post LinkedIn pour annoncer un nouveau mandat exclusif : appartement T3 lumineux à [secteur], 65m², 320 000 €. Ton pro, accroche forte, 3 hashtags pertinents.",
    },
    {
      title: 'Calendrier éditorial 1 mois',
      prompt: "Propose-moi un calendrier éditorial sur 4 semaines pour mes réseaux sociaux : mix annonces, conseils, vie d'agence, témoignages. 3 posts par semaine.",
    },
    {
      title: 'Story Instagram visite',
      prompt: "Imagine-moi un script de story Instagram pour annoncer une visite groupée samedi prochain sur un T2 rénové. Ton fun, accrocheur, CTA clair.",
    },
  ],

  lou: [
    {
      title: 'Annonce optimisée SeLoger',
      prompt: "Rédige une annonce optimisée SEO pour SeLoger : appartement T3 75m² au 3e étage avec balcon, secteur Nice Nord, proche commerces et tramway, 285 000 €. Titre 70 car max, description fluide, mots-clés long-tail.",
    },
    {
      title: 'Article blog quartier',
      prompt: "Écris-moi un article de blog 'Guide quartier' (1000 mots) sur le secteur [nom du quartier] : ambiance, commerces, écoles, transports, prix moyens, profil acheteur-type.",
    },
    {
      title: 'Méta-données page agence',
      prompt: "Mon agence couvre la vente et la gestion locative à [ville]. Génère titre SEO + meta-description (155 car) + URL slug pour la page d'accueil.",
    },
  ],

  elio: [
    {
      title: 'Démarrer une tournée de boitage',
      prompt: "Je commence ma tournée rue [nom de rue], [code postal] [ville]. Voici la première photo de boîte aux lettres, extrais les noms et démarre le tableau.",
    },
    {
      title: 'Simulation porte-à-porte',
      prompt: "Lance une simulation où tu incarnes un propriétaire qui envisage vaguement de vendre mais reste méfiant. Je travaille ma prise d'information.",
    },
    {
      title: 'Protocole RDV vendeur',
      prompt: "Je sors d'un RDV vendeur, démarre le Protocole Rendez-vous Vendeur pour structurer mon compte-rendu et générer les livrables.",
    },
  ],

  manue: [
    {
      title: 'Rentabilité locative',
      prompt: "Calcule la rentabilité brute et nette d'un appartement à 220 000 € (frais notaire inclus), loué 950 €/mois, charges récupérables 80 €, taxe foncière 1 100 €/an, assurance PNO 180 €/an. Je suis en régime réel.",
    },
    {
      title: 'Simulation emprunt',
      prompt: "Mon acheteur a 4 200 € de revenus mensuels nets et veut emprunter 280 000 € sur 25 ans à 3,9 %. Vérifie sa capacité d'emprunt et donne-moi le tableau d'amortissement résumé.",
    },
    {
      title: 'LMNP vs réel foncier',
      prompt: "Mon client hésite entre louer en meublé (LMNP) ou nu (revenus fonciers). Studio 200 000 €, loyer 700 €. Compare brièvement les deux régimes fiscaux.",
    },
  ],

  julia: [
    {
      title: 'Délai rétractation compromis',
      prompt: "Quel est le délai légal de rétractation après signature d'un compromis de vente, et à partir de quel moment court-il exactement ?",
    },
    {
      title: 'Obligations mandat exclusif',
      prompt: "Quelles sont les mentions obligatoires d'un mandat exclusif selon la loi Hoguet ? Cite les articles de référence.",
    },
    {
      title: 'Tantièmes copropriété',
      prompt: "Un copropriétaire conteste son décompte de tantièmes pour des travaux votés en AG. Quelles sont ses voies de recours selon la loi de 1965 ?",
    },
  ],

  rony: [
    {
      title: 'Annonce de recrutement',
      prompt: "Rédige une annonce LinkedIn pour recruter un conseiller immobilier expérimenté en agence à [ville]. Statut indépendant, secteur premium, équipe de 6.",
    },
    {
      title: "Ordre du jour réunion hebdo",
      prompt: "Prépare-moi un ordre du jour structuré pour ma réunion hebdo de lundi matin, équipe de 5 conseillers. Inclus tour de table, chiffres semaine, challenge et capsule coaching.",
    },
    {
      title: 'Bilan KPI conseiller',
      prompt: "Voici les chiffres d'un conseiller sur le mois : 8 estimations, 3 MS, 1 ME, 12 acheteurs en découverte, 18 visites, 4 offres, 1 compromis, 0 baisse de prix. Donne-moi un bilan + plan d'action.",
    },
  ],

  // ==========================================================================
  // Tier 2 — 3 agents spécialisés
  // ==========================================================================

  theo: [
    {
      title: 'Analyse DPE complète',
      prompt: "Lance une analyse complète sur Nice (appartements). Voici les données par classe DPE : [A: 12 annonces à 5 800 €/m², B: 28 à 5 400 €/m², C: 95 à 4 900 €/m², D: 142 à 4 500 €/m², E: 110 à 4 100 €/m², F: 65 à 3 700 €/m², G: 32 à 3 300 €/m²].",
    },
    {
      title: 'Courrier propriétaires F/G',
      prompt: "Une fois l'analyse faite, génère-moi le courrier de prospection ciblant les propriétaires de biens DPE F et G dans le secteur.",
    },
    {
      title: 'ROI rénovation F vers C',
      prompt: "Simule le ROI d'une rénovation énergétique faisant passer un bien de DPE F à DPE C : coût travaux estimé, gain valeur, aides disponibles (MaPrimeRénov', CEE).",
    },
  ],

  ines: [
    {
      title: 'Étude de marché complète',
      prompt: "Je te transmets les fichiers DVF et INSEE pour [commune]. Vérifie leur validité puis lance l'étape 3.1 (Analyse DVF classique).",
    },
    {
      title: 'Top 10 adresses dynamiques',
      prompt: "À partir du fichier DVF déjà chargé, identifie les Top 10 adresses les plus dynamiques en transactions sur les 24 derniers mois.",
    },
    {
      title: 'Rapport final canvas',
      prompt: "Génère le rapport final ultra-détaillé en format canvas (étape 4) avec tableaux, graphiques, plan d'action.",
    },
  ],

  anais: [
    {
      title: 'Nouvelle offre achat',
      prompt: "Je veux rédiger une nouvelle offre d'achat. Pose-moi les questions une par une pour collecter toutes les informations nécessaires.",
    },
    {
      title: 'Mail urgent vendeur',
      prompt: "L'offre est rédigée. Génère maintenant le mail discret/urgent au vendeur pour caler un RDV sous 24h.",
    },
    {
      title: 'Mail confirmation acheteur',
      prompt: "Génère le mail pédagogique de confirmation à l'acheteur, expliquant les 3 scénarios possibles après transmission de l'offre.",
    },
  ],
};

/** Helper : récupérer les templates d'un agent, fallback liste vide. */
export function getTemplatesForAgent(agentId: AgentId): QuickStartTemplate[] {
  return QUICK_START_TEMPLATES[agentId] ?? [];
}
