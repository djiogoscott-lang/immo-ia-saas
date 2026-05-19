'use client';

/**
 * AgentAvatar — affichage visuel d'un agent (avatar + status badge optionnel).
 *
 * Comportement :
 *   - Si `agent.avatar` est défini dans le registry → image custom (ex /avatars/charly.png)
 *   - Sinon → fallback DiceBear (SVG personas auto-généré depuis l'id agent)
 *
 * Le seed DiceBear = agent.id, donc l'avatar est déterministe et stable
 * (Charly aura toujours le même visage généré).
 *
 * Tailles : sm (32), md (64), lg (96), xl (128).
 * Status : ready (vert), active (bleu pulse), thinking (ambre pulse), null (caché).
 */

import { createAvatar } from '@dicebear/core';
import { personas } from '@dicebear/collection';
import { useMemo, useState } from 'react';

import { getAccentStyle } from '@/lib/agents/accent-styles';
import { getAgent, isValidAgentId } from '@/lib/agents/registry';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentAvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export type AgentAvatarStatus = 'ready' | 'active' | 'thinking' | null;

interface AgentAvatarProps {
  agentId: string;
  size?: AgentAvatarSize;
  /** Badge de statut affiché en bas-droite. null pour cacher. Défaut : 'ready'. */
  status?: AgentAvatarStatus;
  /** Ring autour de l'avatar (à utiliser pour l'animation handoff). */
  ringActive?: boolean;
  className?: string;
}

const SIZE_PX: Record<AgentAvatarSize, number> = {
  sm: 32,
  md: 64,
  lg: 96,
  xl: 128,
};

const STATUS_DOT_PX: Record<AgentAvatarSize, number> = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export function AgentAvatar({
  agentId,
  size = 'md',
  status = 'ready',
  ringActive = false,
  className,
}: AgentAvatarProps) {
  const agent = isValidAgentId(agentId) ? getAgent(agentId) : null;
  const accent = agent ? getAccentStyle(agent.accent) : null;
  const px = SIZE_PX[size];

  // État pour basculer en DiceBear si l'image custom échoue à charger
  // (fichier manquant dans /public/avatars/, mauvais nom, etc.)
  const [imageFailed, setImageFailed] = useState(false);

  const useCustomImage = Boolean(agent?.avatar) && !imageFailed;

  // SVG DiceBear toujours pré-généré (utilisé comme fallback ou image principale)
  const dicebearSvg = useMemo(
    () =>
      createAvatar(personas, {
        seed: agentId,
        backgroundType: ['solid'],
        backgroundColor: ['transparent'],
        radius: 50,
      }).toString(),
    [agentId]
  );

  const alt = agent?.name ?? agentId;

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: px, height: px }}
    >
      {/* Cercle de fond légèrement teinté de l'accent agent (visible si l'avatar a fond transparent) */}
      <div
        className={cn(
          'absolute inset-0 rounded-full overflow-hidden ring-2 transition-all duration-300',
          accent ? accent.iconBg : 'bg-zinc-800',
          ringActive
            ? cn(accent?.ringActive ?? 'ring-zinc-400', 'ring-offset-2 ring-offset-zinc-950 shadow-lg')
            : 'ring-white/5'
        )}
      >
        {useCustomImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={agent!.avatar}
            alt=""
            width={px}
            height={px}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div
            className="h-full w-full"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: dicebearSvg }}
            aria-label={alt}
            role="img"
          />
        )}
      </div>

      {status && (
        <StatusBadge
          status={status}
          dotPx={STATUS_DOT_PX[size]}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sous-composant : badge status
// ---------------------------------------------------------------------------

interface StatusBadgeProps {
  status: NonNullable<AgentAvatarStatus>;
  dotPx: number;
}

function StatusBadge({ status, dotPx }: StatusBadgeProps) {
  const color = {
    ready: 'bg-emerald-400',
    active: 'bg-sky-400',
    thinking: 'bg-amber-400',
  }[status];

  const pulse = status === 'active' || status === 'thinking';

  return (
    <span
      aria-hidden
      className="absolute bottom-0 right-0 grid place-items-center"
      style={{ width: dotPx + 4, height: dotPx + 4 }}
    >
      <span
        className={cn(
          'rounded-full ring-2 ring-zinc-950',
          color,
          pulse && 'animate-pulse'
        )}
        style={{ width: dotPx, height: dotPx }}
      />
    </span>
  );
}
