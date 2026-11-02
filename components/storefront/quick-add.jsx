'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Loader2, Plus } from 'lucide-react';
import { apiMessage } from '@/lib/api/browser-api';
import { useCart } from '@/lib/hooks/use-cart';
import { useUiStore } from '@/lib/ui-store';

/** One-tap add for products with a single purchasable variant; everything else opens the product page. */
export function QuickAdd({ variantId, name, locale, productId, price }) {
  const t = useTranslations('Product');
  const { add } = useCart(locale);
  const setCartOpen = useUiStore((state) => state.setCartOpen);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return undefined;
    const timer = setTimeout(() => setDone(false), 2000);
    return () => clearTimeout(timer);
  }, [done]);
  async function run(event) {
    event.preventDefault();
    try {
      await add.mutateAsync({ variantId, quantity: 1, productId, price });
      setDone(true);
      setCartOpen(true);
    } catch { /* surfaced through the alert below */ }
  }
  const label = t('quickAdd', { name });
  return (
    <>
      <button type="button" onClick={run} disabled={add.isPending} aria-label={label} title={label} className="grid size-11 place-items-center rounded-full bg-white/95 text-[#111] shadow-[var(--shadow-md)] transition hover:bg-white disabled:opacity-60">
        {add.isPending ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : done ? <Check size={17} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
      </button>
      <span className="sr-only" role={add.error ? 'alert' : 'status'}>{add.error ? apiMessage(add.error) : done ? t('added') : ''}</span>
    </>
  );
}
