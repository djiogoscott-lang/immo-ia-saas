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
  'assist-immo': [
    {
      title: 'Synthèse de RDV vendeur',
      prompt:
        "Je sors d'un rendez-vous avec un vendeur. Voici les éléments à synthétiser : [vendeur, bien, motivation, points clés]. Génère-moi le résumé du RDV, le mail de remerciement et le post réseaux sociaux.",
    },
    {
      title: 'Plan marketing complet',
      prompt:
        "Crée un plan marketing détaillé pour ce bien que je vais te décrire : [type, surface, secteur, points forts]. Inclus annonce, courrier de prospection et stratégie réseaux sociaux.",
    },
    {
      title: 'Analyse documents vente',
      prompt:
        "Je vais te transmettre les documents du dossier de vente (diagnostics, charges, règlement de copropriété). Fais-moi un récapitulatif des points clés et identifie les anomalies éventuelles.",
    },
  ],

  'my-boitage': [
    {
      title: 'Démarrer une tournée',
      prompt:
        "Je commence ma tournée de boîtage rue [nom de rue], [code postal] [ville]. Voici la première photo de boîte aux lettres, peux-tu extraire les noms ?",
    },
    {
      title: 'Tableau vierge à remplir',
      prompt:
        "Donne-moi un tableau vierge prêt à remplir pour ma tournée de boîtage du jour (colonnes nom, adresse, CP, ville, date, commentaires).",
    },
    {
      title: 'Export Excel fin de tournée',
      prompt:
        "J'ai terminé ma tournée. Récapitule le tableau complet et prépare-le pour un export Excel.",
    },
  ],

  'my-dpe': [
    {
      title: 'Analyse de marché DPE',
      prompt:
        "Je veux analyser l'impact du DPE sur le marché à [ville], pour des [appartements/maisons]. Je vais te donner le nombre d'annonces et le prix moyen au m² par classe DPE (A à G).",
    },
    {
      title: 'Argumentaire vendeur DPE F/G',
      prompt:
        "J'ai un vendeur avec un bien classé DPE F à [ville]. Crée-moi un argumentaire complet pour le sensibiliser à l'impact du DPE et lui proposer une stratégie de valorisation.",
    },
    {
      title: 'Courrier prospection passoires',
      prompt:
        "Génère un courrier de prospection ciblant les propriétaires de biens en classes E, F et G dans le secteur de [ville], avec des chiffres locaux.",
    },
  ],

  'reunion-immo': [
    {
      title: 'Réunion hebdo complète',
      prompt:
        "Prépare ma réunion d'équipe de lundi. Voici notre tableau de suivi de la semaine : [colle ici]. Donne-moi ordre du jour, analyse, challenge, capsule coaching, compte-rendu et slides Gamma.",
    },
    {
      title: 'Focus mandats dormants',
      prompt:
        "Prépare une réunion axée sur les mandats en difficulté et propose des actions de relance concrètes pour mon équipe.",
    },
    {
      title: 'Génère les slides Gamma',
      prompt:
        "Génère uniquement les slides Gamma (format texte avec --- entre chaque slide) pour ma réunion sur le thème : [thème].",
    },
  ],

  'ma-perf-immo': [
    {
      title: 'Ajouter une fiche collaborateur',
      prompt:
        "Je veux ajouter les performances de [prénom], conseiller, pour la semaine du [date]. Pose-moi les questions dans l'ordre.",
    },
    {
      title: 'Bilan + plan d\'action',
      prompt:
        "Pour [prénom], génère le bilan complet de la période, identifie son profil (vendeur/acheteur/équilibré) et propose un plan d'action personnalisé.",
    },
    {
      title: 'Mail d\'alerte bienveillant',
      prompt:
        "Rédige un mail d'alerte bienveillant à [prénom] dont les ratios ne sont pas atteints ce mois-ci, avec des suggestions concrètes de recalibrage.",
    },
  ],

  'immo-predictor': [
    {
      title: 'Lancer une étude de marché',
      prompt:
        "Je veux lancer une étude de marché complète sur [ville/secteur]. Je vais te transmettre les fichiers DVF et INSEE. Guide-moi étape par étape.",
    },
    {
      title: 'Analyse DPE par typologie',
      prompt:
        "À partir de mes données DVF, analyse les prix au m² par typologie (T2/T3/T4) et donne-moi la projection 2025 (outliers ±10 % exclus).",
    },
    {
      title: 'Plan d\'action stratégique',
      prompt:
        "Génère uniquement la partie 'Coaching & Recommandations Stratégiques' : justification de prix, techniques de closing, stratégies marketing et plan d'action.",
    },
  ],

  'post-rdv-vendeur': [
    {
      title: 'Kit complet post-RDV',
      prompt:
        "Je sors d'un RDV vendeur. Voici les données : [nom, type de bien, secteur, surface, atouts, motif, urgence, prix]. Génère le mail de remerciement, le SMS interne, le post teaser, le flyer long et l'annonce.",
    },
    {
      title: 'Flyer prospection quartier',
      prompt:
        "Génère uniquement le flyer de prospection (version développée) pour annoncer ce nouveau bien dans le quartier : [type, surface, secteur, atouts].",
    },
    {
      title: 'SMS interne équipe',
      prompt:
        "Rédige le SMS court à envoyer à l'équipe interne pour les informer du nouveau bien : [type, secteur, prochaine étape].",
    },
  ],

  'redac-offre': [
    {
      title: 'Nouvelle offre d\'achat',
      prompt:
        "Je veux rédiger une nouvelle offre d'achat. Pose-moi les questions une par une pour collecter toutes les informations nécessaires.",
    },
    {
      title: 'Mail urgent vendeur',
      prompt:
        "Génère uniquement le mail urgent au vendeur (sans mentionner explicitement l'offre) pour organiser un RDV rapide : [adresse du bien, nom du vendeur].",
    },
    {
      title: 'Mail confirmation acheteur',
      prompt:
        "Génère uniquement le mail à l'acheteur confirmant la transmission de son offre, avec les 3 scénarios possibles expliqués pédagogiquement.",
    },
  ],

  'assistant-compromis': [
    {
      title: 'Relance notaire',
      prompt:
        "Rédige un email professionnel au notaire pour relancer le projet d'acte du dossier [nom du bien / adresse], compromis signé le [date].",
    },
    {
      title: 'Préparer l\'acheteur',
      prompt:
        "Mon acheteur est primo-accédant. Prépare-lui un message clair expliquant les étapes entre le compromis et l'acte authentique, sans jargon juridique.",
    },
    {
      title: 'Demander un diagnostic',
      prompt:
        "Rédige un email + un SMS court pour demander un devis et organiser un RDV avec un diagnostiqueur pour [type de bien] situé [adresse].",
    },
  ],

  'my-juridic-assistant': [
    {
      title: 'Question loi Hoguet',
      prompt:
        "Quelles sont les obligations d'affichage d'un agent immobilier titulaire de la carte T selon la loi Hoguet ? Cite les articles précis.",
    },
    {
      title: 'Copropriété — AG',
      prompt:
        "Un copropriétaire conteste une décision d'AG votée à la majorité simple. Quelles sont les conditions et délais pour contester selon la loi de 1965 ?",
    },
    {
      title: 'Délai de rétractation',
      prompt:
        "Explique-moi le délai de rétractation SRU après signature d'un compromis : durée, point de départ, formalisme requis, articles applicables.",
    },
  ],

  'train-my-agent': [
    {
      title: 'Démarrer une simulation',
      prompt:
        "Je veux m'entraîner à la prospection porte-à-porte. Lance la simulation : je frappe à ta porte.",
    },
    {
      title: 'Simulation prospect difficile',
      prompt:
        "Lance une simulation où tu incarnes un prospect agressif et pressé qui n'a aucune intention de vendre. Je m'entraîne à gérer les objections.",
    },
    {
      title: 'Simulation vendeur potentiel',
      prompt:
        "Lance une simulation où tu incarnes un propriétaire qui envisage vaguement de vendre mais reste méfiant. Je veux travailler ma prise d'information.",
    },
  ],

  'assistant-immo-vendeur': [
    {
      title: 'Lancer le protocole RDV vendeur',
      prompt:
        "Lance le Protocole Rendez-vous Vendeur. Je vais répondre aux questions une par une pour structurer mon compte-rendu.",
    },
    {
      title: 'Reprendre un protocole en cours',
      prompt:
        "Je veux reprendre le protocole en cours pour le vendeur [prénom nom]. Voici les infos déjà collectées : [résumé].",
    },
    {
      title: 'Générer livrables finaux',
      prompt:
        "Le protocole est terminé pour [nom du vendeur]. Génère le compte-rendu, le texte publicitaire, le post réseaux sociaux, le mail de remerciement et le courrier quartier.",
    },
  ],
};

/** Helper : récupérer les templates d'un agent, fallback liste vide. */
export function getTemplatesForAgent(agentId: AgentId): QuickStartTemplate[] {
  return QUICK_START_TEMPLATES[agentId] ?? [];
}
