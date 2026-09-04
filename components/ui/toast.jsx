'use client';

import { create } from 'zustand';
import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const useToastStore = create((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = toast.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const item = { id, tone: 'info', duration: 4500, ...toast };
    set({ toasts: [...get().toasts, item] });
    if (item.duration > 0) {
      setTimeout(() => get().remove(id), item.duration);
    }
    return id;
  },
  remove: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  clear: () => set({ toasts: [] })
}));

export function pushToast(toast) {
  return useToastStore.getState().push(toast);
}

export function dismissToast(id) {
  useToastStore.getState().remove(id);
}

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle
};

const TONES = {
  info: 'border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text)]',
  success: 'border-[color-mix(in_srgb,var(--color-success)_24%,white)] bg-[var(--color-surface-raised)] text-[var(--color-success)]',
  warning: 'border-[color-mix(in_srgb,var(--color-warning)_24%,white)] bg-[var(--color-surface-raised)] text-[var(--color-warning)]',
  error: 'border-[color-mix(in_srgb,var(--color-danger)_24%,white)] bg-[var(--color-surface-raised)] text-[var(--color-danger)]'
};

export function ToastViewport({ className }) {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  useEffect(() => () => useToastStore.getState().clear(), []);

  return (
    <div aria-live="polite" aria-atomic="true" className={cn('pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:right-4 sm:left-auto sm:items-end', className)}>
      {toasts.map((t) => {
        const Icon = t.icon || ICONS[t.tone] || Info;
        return (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={cn('pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-sm)] border p-4 shadow-[var(--shadow-md)]', TONES[t.tone] || TONES.info)}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div className="grid flex-1 gap-1">
              {t.title ? <p className="text-sm font-semibold leading-5">{t.title}</p> : null}
              {t.description ? <p className="text-sm leading-5">{t.description}</p> : null}
              {t.action ? <button type="button" onClick={() => { t.action.onClick?.(); remove(t.id); }} className="mt-1 text-xs font-semibold underline">{t.action.label}</button> : null}
            </div>
            <button type="button" aria-label="Dismiss" onClick={() => remove(t.id)} className="rounded-full p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)]">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}