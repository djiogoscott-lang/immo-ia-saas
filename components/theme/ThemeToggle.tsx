'use client';

/**
 * ThemeToggle — bouton Sun/Moon qui bascule clair/sombre via next-themes.
 *
 * Le composant gère l'état "mounted" pour éviter le mismatch SSR/CSR
 * (next-themes ne connaît pas le thème côté serveur).
 */

import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Placeholder pour éviter le hydration flash.
    return (
      <div
        aria-hidden
        className={cn(
          'h-9 w-9 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50',
          className
        )}
      />
    );
  }

  const isDark = (theme === 'system' ? resolvedTheme : theme) === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
      className={cn(
        'group relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-zinc-200/60 bg-white/60 backdrop-blur-md transition-all hover:border-zinc-300 hover:bg-white dark:border-zinc-800/60 dark:bg-zinc-900/60 dark:hover:border-zinc-700 dark:hover:bg-zinc-900',
        className
      )}
    >
      <motion.div
        key={isDark ? 'moon' : 'sun'}
        initial={{ opacity: 0, rotate: -45, scale: 0.6 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-center"
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-zinc-300" aria-hidden />
        ) : (
          <Sun className="h-4 w-4 text-amber-500" aria-hidden />
        )}
      </motion.div>
    </button>
  );
}
