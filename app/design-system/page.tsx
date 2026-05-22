/**
 * Page de démonstration du design system éditorial NAIOM-like.
 *
 * Sert de référence visuelle pour valider le Lot 1 avant de refondre les
 * pages réelles au Lot 2. Force le mode clair localement via DocumentLayout.
 */

import { AgentAvatar } from '@/components/agents/AgentAvatar';
import {
  BigNumber,
  Chapter,
  CoverSection,
  DocumentLayout,
  EditorialCard,
  GuardrailBox,
  PrincipleBox,
  TLDRBox,
} from '@/components/editorial';
import { APP_BASELINE, APP_NAME } from '@/lib/branding';

export const metadata = {
  title: 'Design system — Immo IA SaaS',
};

export default function DesignSystemPage() {
  return (
    <DocumentLayout>
      {/* ====================================================================
          COVER
          ==================================================================== */}
      <CoverSection
        eyebrow={`${APP_NAME} × Multi-Agent · Design system mai 2026`}
        titleLine1="Une équipe immobilière IA."
        titleLine2="Construite en interne."
        subtitle={`${APP_BASELINE}. Architecture, agents, workflow et économie de la plateforme — telle qu'elle est conçue, telle qu'elle tourne aujourd'hui.`}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span>Start Academy · Plateforme {APP_NAME}</span>
            <span>Design system éditorial</span>
          </div>
        }
      />

      {/* ====================================================================
          BODY — toutes les démos de composants
          ==================================================================== */}
      <div className="mx-auto max-w-editorial px-6 py-20 sm:px-12">
        {/* --- Chapter + TLDR ---------------------------------------------- */}
        <Chapter
          number="01"
          eyebrow="Introduction"
          title="11 agents, 1 orchestratrice, 0 confusion."
          subtitle="Une agence immo classique vend du temps humain. Un copilote IA isolé vend du texte au coup par coup. Immo IA SaaS vend une chaîne d'agents spécialisés."
        />

        <div className="mt-10 space-y-6 text-base leading-relaxed text-ink-soft">
          <p>
            La plateforme repose sur 11 agents spécialisés (Charly orchestratrice
            + 10 experts métier) qui s'enchaînent dans des workflows
            reproductibles. Chaque livrable a un dossier, chaque décision est
            tracée dans son frontmatter YAML, chaque agent a un rôle explicite.
          </p>

          <TLDRBox>
            <ol className="list-decimal pl-5">
              <li>
                <strong>Charly</strong> — orchestratrice unique : route,
                consolide, ne produit jamais le livrable elle-même.
              </li>
              <li>
                <strong>10 agents experts</strong> — Tom, John, Lou, Elio, Manue,
                Julia, Rony, Théo, Inès, Anaïs.
              </li>
              <li>
                <strong>Workflows chaînés</strong> — mandat vendeur → annonce →
                post LinkedIn → vérif juridique, avec dossiers de sortie
                versionnés.
              </li>
            </ol>
          </TLDRBox>
        </div>

        {/* --- BigNumber x3 ------------------------------------------------ */}
        <div className="mt-20">
          <Chapter
            number="02"
            eyebrow="Économie"
            title="Économie unitaire"
            subtitle="Le moteur est bon marché. Le vrai levier, c'est le temps."
          />

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <BigNumber value="~ 3 €" label="Coût API par workflow complet" />
            <BigNumber value="~ 30 €" label="Coût mensuel par conseiller actif" />
            <BigNumber value="> 95 %" label="Marge brute en abonnement SaaS" />
          </div>
        </div>

        {/* --- PrincipleBox ------------------------------------------------ */}
        <div className="mt-20">
          <Chapter
            number="03"
            eyebrow="Architecture"
            title="Le principe orchestrateur"
          />

          <div className="mt-10">
            <PrincipleBox>
              <strong>L'orchestratrice n'écrit jamais le livrable elle-même.</strong>{' '}
              Charly route, consolide, enchaîne. C'est ce qui empêche la
              confusion des rôles et permet d'auditer la chaîne : chaque
              livrable Markdown a un auteur unique, identifié dans son
              frontmatter YAML.
            </PrincipleBox>
          </div>
        </div>

        {/* --- GuardrailBox ------------------------------------------------ */}
        <div className="mt-12">
          <GuardrailBox label="Convention critique">
            Chaque livrable persisté en base a un frontmatter YAML obligatoire
            (<code>agent_id</code>, <code>conversation_id</code>,{' '}
            <code>created_at</code>, <code>version</code>, <code>statut</code>)
            qui rend la chaîne auditable et permet à un agent de relire ce qu'un
            autre a produit avant lui.
          </GuardrailBox>
        </div>

        {/* --- EditorialCard x3 (échantillon agents) ----------------------- */}
        <div className="mt-20">
          <Chapter
            number="04"
            eyebrow="Les agents"
            title="Charly, Julia, Elio — exemples"
            subtitle="Format de fiche agent éditoriale : avatar, méta modèle, mission, frameworks, livrables, outils."
          />

          <div className="mt-10 space-y-4">
            <EditorialCard
              avatar={<AgentAvatar agentId="charly" size="lg" status={null} />}
              name="Charly — Orchestratrice"
              meta="MISTRAL LARGE · ROUTAGE & HANDOFF"
              description="Accueille la demande de l'utilisateur, qualifie le besoin, présente l'expert le plus adapté et lance le handoff. Ne produit jamais elle-même un livrable métier."
              details={[
                { label: 'Mission', value: 'Routage + conversation généraliste + clarification' },
                { label: 'Livrable', value: 'Aucun — déclenche les autres agents' },
                { label: 'Outils', value: 'handoff(agentId), askClarification(question)' },
              ]}
            />

            <EditorialCard
              avatar={<AgentAvatar agentId="julia" size="lg" status={null} />}
              name="Julia — Juridique & Conformité"
              meta="CLAUDE SONNET 4.6 · LOI HOGUET, COPROPRIÉTÉ, BAUX"
              description="Réponses juridiques fondées sur les textes officiels (loi Hoguet 1970, copropriété 1965, baux d'habitation 1989). Cite systématiquement les articles de loi. Ne fait pas conseil juridique personnalisé."
              details={[
                { label: 'Frameworks', value: 'IRAC · Légifrance · Article par article' },
                { label: 'Livrable', value: 'briefs-juridiques/{date}-{client}-{sujet}.md' },
                { label: 'Outils', value: 'Read, WebSearch, PISTE/DILA API' },
              ]}
            />

            <EditorialCard
              avatar={<AgentAvatar agentId="elio" size="lg" status={null} />}
              name="Elio — Commercial & Prospection"
              meta="CLAUDE SONNET 4.6 · BOITAGE, PORTE-À-PORTE, RDV VENDEUR"
              description="OCR de boîtes aux lettres pour le boitage, jeu de rôle prospect en porte-à-porte avec mode coach post-entretien, et protocole RDV vendeur structuré qui livre compte-rendu + post + courrier quartier."
              details={[
                { label: 'Frameworks', value: 'Protocole 5 étapes · Jeu de rôle situationnel' },
                { label: 'Livrable', value: 'fiches-vendeur/{date}-{adresse}.md' },
                { label: 'Outils', value: 'OCR images, Write, génération multi-format' },
              ]}
            />
          </div>
        </div>

        {/* --- Tableau éditorial simple ------------------------------------ */}
        <div className="mt-20">
          <Chapter
            number="05"
            eyebrow="Stack"
            title="La stack technique"
            subtitle="Rien d'exotique. Des briques bien établies branchées via un fichier d'instructions partagé."
          />

          <div className="mt-10 overflow-hidden border border-ink-line">
            <table className="w-full text-sm">
              <thead className="bg-ink text-paper">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.22em]">
                    Brique
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.22em]">
                    Rôle
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.22em]">
                    Détail
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-line text-ink-soft">
                <tr>
                  <td className="px-5 py-4 font-semibold text-ink">Charly</td>
                  <td className="px-5 py-4">Orchestratrice. Route vers les 10 experts, consolide les handoffs.</td>
                  <td className="px-5 py-4 font-mono text-xs text-ink-muted">Mistral Large 2411</td>
                </tr>
                <tr>
                  <td className="px-5 py-4 font-semibold text-ink">Experts</td>
                  <td className="px-5 py-4">10 agents métier, chacun défini dans <code className="rounded bg-paper-muted px-1.5 py-0.5 font-mono text-[0.85em]">lib/agents/registry.ts</code>.</td>
                  <td className="px-5 py-4 font-mono text-xs text-ink-muted">Sonnet 4.6 / Haiku 4.5</td>
                </tr>
                <tr>
                  <td className="px-5 py-4 font-semibold text-ink">RAG</td>
                  <td className="px-5 py-4">Pool global utilisateur : PDF + DOCX → embeddings Nomic 768d.</td>
                  <td className="px-5 py-4 font-mono text-xs text-ink-muted">pgvector cosine</td>
                </tr>
                <tr>
                  <td className="px-5 py-4 font-semibold text-ink">Livrables</td>
                  <td className="px-5 py-4">Markdown + frontmatter YAML versionné, persistés en Supabase.</td>
                  <td className="px-5 py-4 font-mono text-xs text-ink-muted">Supabase + gray-matter</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* --- Workflow chaîné (preview placeholder) ----------------------- */}
        <div className="mt-20">
          <Chapter
            number="06"
            eyebrow="Workflow"
            title="Workflow mandat vendeur"
            subtitle="Un workflow type pour un nouveau mandat. Chaque étape lit la précédente."
          />

          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-4">
            {[
              { step: 'Étape 1', agent: 'Elio', task: 'Protocole RDV vendeur → fiche complète.', out: 'fiches-vendeur/' },
              { step: 'Étape 2', agent: 'Lou', task: 'Lit la fiche → annonce SEO portails.', out: 'annonces/' },
              { step: 'Étape 3', agent: 'John', task: 'Lit annonce → post LinkedIn + carrousel.', out: 'posts/' },
              { step: 'Étape 4', agent: 'Julia', task: 'Vérifie conformité Hoguet + mandat.', out: 'verifs/' },
            ].map((s) => (
              <div key={s.step} className="border border-ink-line bg-paper-soft p-5">
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-muted">
                  {s.step}
                </div>
                <div className="mt-2 font-display text-xl font-extrabold tracking-display-tight text-ink">
                  {s.agent}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">{s.task}</p>
                <div className="mt-3 font-mono text-[10px] text-ink-muted">→ {s.out}</div>
              </div>
            ))}
          </div>
        </div>

        {/* --- Cover finale -------------------------------------------------*/}
      </div>

      <CoverSection
        titleLine1="La vraie valeur,"
        titleLine2="c'est l'architecture."
        subtitle="Une chaîne où chaque rôle est explicite, chaque livrable a un dossier, chaque décision est traçable. Un agent isolé écrit du texte. Une plateforme produit un système — reproductible, auditable, qui s'améliore à chaque conseiller."
        footer={
          <div className="space-y-1">
            <div className="font-semibold text-paper">Laurent — Start Academy</div>
            <div>Plateforme {APP_NAME}</div>
            <div>laurent@start-academy.fr</div>
          </div>
        }
      />
    </DocumentLayout>
  );
}
