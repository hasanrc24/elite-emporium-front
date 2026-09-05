'use client';

import { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'elite-emporium-admin-theme';

export function ThemeToggle() {
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const next = stored === 'dark' || stored === 'light'
      ? stored
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
  }, []);

  const toggle = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem(STORAGE_KEY, next);
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className="grid size-10 place-items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-muted)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
      aria-label="Toggle light and dark mode"
      title="Toggle light and dark mode"
    >
      <Moon className="theme-icon-light" size={18} />
      <Sun className="theme-icon-dark" size={18} />
    </button>
  );
}
