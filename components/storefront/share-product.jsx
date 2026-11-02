'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Link2, MessageCircle, Share2, ThumbsUp } from 'lucide-react';

const noSubscription = () => () => {};

/**
 * Product share (BR-MKT-005): one button. It opens the native share sheet
 * where the browser has one, otherwise a small menu with WhatsApp, Facebook
 * and copy link.
 */
export function ShareProduct({ name }) {
  const t = useTranslations('Product');
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef(null);
  // The server snapshot is false so the first client render matches SSR.
  const canShare = useSyncExternalStore(noSubscription, () => typeof navigator.share === 'function', () => false);
  const pageUrl = () => window.location.href.split('#')[0];

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => { if (event.type === 'keydown' ? event.key === 'Escape' : !rootRef.current?.contains(event.target)) setMenuOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, [menuOpen]);

  const nativeShare = async () => {
    try {
      await navigator.share({ title: name, url: pageUrl() });
    } catch {
      // The customer dismissed the share sheet.
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  const open = (target) => {
    const url = encodeURIComponent(pageUrl());
    const href = target === 'facebook' ? `https://www.facebook.com/sharer/sharer.php?u=${url}` : `https://wa.me/?text=${encodeURIComponent(`${name} `)}${url}`;
    window.open(href, '_blank', 'noopener,noreferrer');
    setMenuOpen(false);
  };

  const item = 'flex min-h-11 w-full items-center gap-3 px-4 text-left text-[14px] hover:bg-[var(--color-surface)]';
  return (
    <div ref={rootRef} className="relative mt-4">
      <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border-strong)] px-4 text-[14px] transition hover:border-[var(--color-text)]" aria-haspopup={canShare ? undefined : 'menu'} aria-expanded={canShare ? undefined : menuOpen} onClick={canShare ? nativeShare : () => setMenuOpen((value) => !value)}>
        <Share2 size={16} aria-hidden="true" />{t('share')}
      </button>
      {menuOpen && !canShare ? (
        <div role="menu" aria-label={t('share')} className="absolute bottom-full left-0 z-20 mb-2 w-52 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] py-1 shadow-[var(--shadow-md)]">
          <button type="button" role="menuitem" className={item} onClick={() => open('whatsapp')}><MessageCircle size={17} aria-hidden="true" />WhatsApp</button>
          <button type="button" role="menuitem" className={item} onClick={() => open('facebook')}><ThumbsUp size={17} aria-hidden="true" />Facebook</button>
          <button type="button" role="menuitem" className={item} onClick={copy} aria-live="polite">{copied ? <Check size={17} aria-hidden="true" /> : <Link2 size={17} aria-hidden="true" />}{copied ? t('linkCopied') : t('copyLink')}</button>
        </div>
      ) : null}
    </div>
  );
}
