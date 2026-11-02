'use client';

import { Moon, Sun } from 'lucide-react';
import { setTheme, useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

/**
 * Light/dark switch shared by the storefront and admin. Icons swap through CSS
 * on `data-theme`, so the server-rendered button is already correct.
 */
export function ThemeToggle({ label = 'Dark mode', className }) {
  const theme = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')}
      aria-pressed={theme ? theme === 'dark' : undefined}
      aria-label={label}
      title={label}
      className={cn('grid place-items-center', className)}
    >
      <Moon className="theme-icon-light" size={19} aria-hidden="true" />
      <Sun className="theme-icon-dark" size={19} aria-hidden="true" />
    </button>
  );
}
