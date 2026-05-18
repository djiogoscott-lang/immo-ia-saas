'use client';

/**
 * AgentChat — composant client qui orchestre une conversation avec UN agent.
 *
 * - useChat() du Vercel AI SDK pour le streaming
 * - Markdown rendering via <MarkdownMessage> sur les réponses de l'assistant
 * - Barre d'actions sous chaque message assistant (Copy, Regenerate, Export)
 * - 3 cartes de démarrage rapide tant qu'aucun message n'a été échangé
 * - Prefill via searchParam (?prefill=...) depuis l'orchestrateur LLM
 */

import { useChat } from '@ai-sdk/react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Check,
  ClipboardCheck,
  Copy,
  DoorOpen,
  Download,
  FileSignature,
  FileText,
  Mailbox,
  Megaphone,
  PenSquare,
  Presentation,
  RefreshCw,
  Scale,
  Send,
  TrendingUp,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import { MarkdownMessage } from '@/components/agents/MarkdownMessage';
import { QuickStartTemplates } from '@/components/agents/QuickStartTemplates';
import type { AgentConfig } from '@/lib/agents/registry';

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  Mailbox,
  Zap,
  Presentation,
  BarChart3,
  TrendingUp,
  Megaphone,
  PenSquare,
  FileSignature,
  Scale,
  DoorOpen,
  ClipboardCheck,
};

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

interface AgentChatProps {
  agent: AgentConfig;
}

export function AgentChat({ agent }: AgentChatProps) {
  const Icon = ICON_MAP[agent.icon];

  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
    append,
    reload,
  } = useChat({
    api: '/api/chat',
    body: { agentId: agent.id },
    onError: (err) => {
      console.error('[AgentChat] erreur de streaming :', err);
    },
  });

  // Prefill via searchParam : redirection depuis l'orchestrateur LLM auto.
  const searchParams = useSearchParams();
  const prefill = searchParams?.get('prefill') ?? null;
  const prefillSentRef = useRef(false);
  useEffect(() => {
    if (prefill && !prefillSentRef.current) {
      prefillSentRef.current = true;
      append({ role: 'user', content: prefill });
    }
  }, [prefill, append]);

  // Auto-scroll en bas à chaque nouveau message
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const hasMessages = messages.length > 0;
  const lastAssistantIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  })();

  return (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-950">
      {/* En-tête avec identité de l'agent */}
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-900/50"
        >
          {Icon ? <Icon className="h-5 w-5" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold text-zinc-900 dark:text-zinc-50">
            {agent.name}
          </h1>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {agent.tagline}
          </p>
        </div>
      </header>

      {/* Zone de conversation */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Greeting + templates de démarrage rapide (avant le 1er message) */}
          {!hasMessages && (
            <>
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-white px-5 py-4 text-sm text-zinc-700 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-zinc-900 dark:text-zinc-300">
                {agent.greeting}
              </div>

              <QuickStartTemplates
                agentId={agent.id}
                onSelect={(prompt) => {
                  setInput(prompt);
                }}
              />
            </>
          )}

          {messages.map((message, idx) => (
            <MessageBubble
              key={message.id}
              role={message.role}
              content={message.content}
              agent={agent}
              isLastAssistant={
                message.role === 'assistant' && idx === lastAssistantIdx
              }
              onRegenerate={reload}
              streaming={isLoading && idx === lastAssistantIdx}
            />
          ))}

          {/* Erreur de streaming */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
              <p className="font-medium">Erreur de communication avec l'agent.</p>
              <p className="mt-1 text-xs opacity-80">{error.message}</p>
            </div>
          )}

          <div ref={bottomRef} aria-hidden />
        </div>
      </div>

      {/* Composer (input + envoi) */}
      <footer className="border-t border-slate-200 bg-slate-50/50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-3xl items-end gap-2"
        >
          <textarea
            value={input}
            onChange={handleInputChange}
            placeholder={`Écris ton message à ${agent.name}…`}
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSubmit(event as unknown as React.FormEvent<HTMLFormElement>);
              }
            }}
          />
          {isLoading ? (
            <button
              type="button"
              onClick={stop}
              className="shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none dark:disabled:bg-zinc-700"
            >
              <Send className="h-4 w-4" aria-hidden />
              Envoyer
            </button>
          )}
        </form>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-zinc-400">
          {agent.name} peut faire des erreurs — vérifie les informations importantes.
        </p>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bulle de message + actions
// ---------------------------------------------------------------------------

interface MessageBubbleProps {
  role: string;
  content: string;
  agent: AgentConfig;
  isLastAssistant: boolean;
  streaming: boolean;
  onRegenerate: () => void;
}

function MessageBubble({
  role,
  content,
  agent,
  isLastAssistant,
  streaming,
  onRegenerate,
}: MessageBubbleProps) {
  const isUser = role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-emerald-600 px-4 py-2.5 text-sm text-white shadow-sm">
          <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
        </div>
      </div>
    );
  }

  // Assistant : rendu markdown + barre d'actions
  return (
    <div className="flex justify-start">
      <div className="group max-w-[85%] space-y-2">
        <div className="rounded-2xl rounded-bl-sm border border-slate-100 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <MarkdownMessage>{content}</MarkdownMessage>
          {streaming && (
            <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-zinc-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              en cours…
            </div>
          )}
        </div>

        {/* Actions visibles uniquement sur le DERNIER message assistant (les
            précédents restent figés — c'est l'UX standard ChatGPT). */}
        {isLastAssistant && !streaming && content.length > 0 && (
          <MessageActions
            content={content}
            agentName={agent.name}
            onRegenerate={onRegenerate}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Barre d'actions sous un message assistant
// ---------------------------------------------------------------------------

interface MessageActionsProps {
  content: string;
  agentName: string;
  onRegenerate: () => void;
}

function MessageActions({
  content,
  agentName,
  onRegenerate,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponible (Safari iframe, permission denied…) — fallback
      const ta = document.createElement('textarea');
      ta.value = content;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  const handleExport = () => {
    const filename = `${agentName.toLowerCase().replace(/\s+/g, '-')}-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:.]/g, '-')}.md`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-1 px-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
      <ActionButton
        onClick={handleCopy}
        ariaLabel="Copier le texte"
        title={copied ? 'Copié !' : 'Copier le texte'}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden />
        )}
        <span>{copied ? 'Copié' : 'Copier'}</span>
      </ActionButton>

      <ActionButton
        onClick={onRegenerate}
        ariaLabel="Régénérer la réponse"
        title="Régénérer la réponse"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        <span>Régénérer</span>
      </ActionButton>

      <ActionButton
        onClick={handleExport}
        ariaLabel="Exporter en Markdown"
        title="Télécharger en .md"
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        <span>Exporter</span>
      </ActionButton>
    </div>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  ariaLabel: string;
  title: string;
  children: React.ReactNode;
}

function ActionButton({ onClick, ariaLabel, title, children }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-slate-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      {children}
    </button>
  );
}
