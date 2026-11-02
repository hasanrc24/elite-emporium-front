'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ZoomIn } from 'lucide-react';

/**
 * Mobile: full-width swipe track with dots. Desktop: two-column image stack.
 * Any image opens a zoomable lightbox (keyboard and touch friendly).
 */
export function ProductGallery({ product, images }) {
  const t = useTranslations('Product');
  const tc = useTranslations('Common');
  const list = images?.length ? images : product.images || [];
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(null);
  const [magnified, setMagnified] = useState(null);
  const trackRef = useRef(null);

  // Reset to the first image whenever the variant's image set changes.
  const firstUrl = list[0]?.url;
  useEffect(() => { queueMicrotask(() => setActive(0)); trackRef.current?.scrollTo({ left: 0 }); }, [firstUrl]);

  function onScroll() {
    const track = trackRef.current;
    if (!track) return;
    setActive(Math.round(track.scrollLeft / track.clientWidth));
  }

  if (!list.length) return <div className="product-media rounded-[var(--radius-sm)]"><span className="absolute inset-0 grid place-items-center text-xs uppercase tracking-[.2em] text-[var(--color-muted)]">Elite Emporium</span></div>;

  return (
    <section aria-label={t('gallery', { name: product.name })}>
      <div className="relative -mx-4 md:hidden">
        <div ref={trackRef} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain">
          {list.map((image, index) => (
            <button key={`${image.url}-${index}`} type="button" onClick={() => setZoom(index)} className="product-media max-h-[66svh] w-full shrink-0 snap-center" aria-label={`${t('zoom')} — ${t('imageOf', { index: index + 1, total: list.length })}`}>
              <Image src={image.url} alt={image.alt || product.name} fill sizes="(max-width: 767px) 100vw, 45vw" priority={index === 0} />
            </button>
          ))}
        </div>
        {list.length > 1 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center" aria-hidden="true">
            <span className="flex items-center gap-1.5 rounded-full bg-white/70 px-2 py-1.5 backdrop-blur-sm">
              {list.map((image, index) => <span key={`${image.url}-dot-${index}`} className={`h-1.5 rounded-full transition-all ${index === active ? 'w-4 bg-[#111]' : 'w-1.5 bg-black/30'}`} />)}
            </span>
          </div>
        ) : null}
        <span className="sr-only" aria-live="polite">{t('imageOf', { index: active + 1, total: list.length })}</span>
      </div>

      <div className="hidden gap-2 md:grid md:grid-cols-2">
        {list.slice(0, 8).map((image, index) => (
          <button key={`${image.url}-${index}`} type="button" onClick={() => setZoom(index)} className={`product-media group cursor-zoom-in rounded-[var(--radius-sm)] ${list.length === 1 || (index === 0 && list.length % 2 === 1) ? 'md:col-span-2 md:aspect-[4/5]' : ''}`} aria-label={`${t('zoom')} — ${t('imageOf', { index: index + 1, total: list.length })}`}>
            <Image src={image.url} alt={image.alt || product.name} fill sizes="(min-width: 1200px) 30vw, 45vw" priority={index === 0} />
            <span className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-full bg-white/90 text-[#111] opacity-0 transition group-hover:opacity-100"><ZoomIn size={16} /></span>
          </button>
        ))}
      </div>

      <Dialog.Root open={zoom != null} onOpenChange={(open) => { if (!open) { setZoom(null); setMagnified(null); } }}>
        <Dialog.Portal>
          <Dialog.Overlay className="sheet-overlay fixed inset-0 z-[70] bg-[var(--color-bg)]" />
          <Dialog.Content className="fixed inset-0 z-[71] overflow-y-auto focus:outline-none" onOpenAutoFocus={(event) => { event.preventDefault(); document.getElementById(`zoom-${zoom}`)?.scrollIntoView({ block: 'start' }); }}>
            <Dialog.Title className="sr-only">{t('gallery', { name: product.name })}</Dialog.Title>
            <Dialog.Description className="sr-only">{product.name}</Dialog.Description>
            <Dialog.Close className="fixed right-4 top-4 z-10 grid size-11 place-items-center rounded-full bg-[var(--color-surface-raised)] text-[var(--color-text)] shadow-[var(--shadow-md)]" aria-label={tc('close')}><X size={22} /></Dialog.Close>
            <div className="mx-auto grid max-w-3xl gap-2">
              {list.map((image, index) => (
                <div key={`${image.url}-zoom-${index}`} id={`zoom-${index}`} className={`relative aspect-[3/4] w-full ${magnified === index ? 'overflow-auto overscroll-contain' : 'overflow-hidden'}`}>
                  <button type="button" onClick={() => setMagnified(magnified === index ? null : index)} aria-pressed={magnified === index} aria-label={`${magnified === index ? t('zoomOut') : t('zoom')} — ${t('imageOf', { index: index + 1, total: list.length })}`} className={`relative block h-full ${magnified === index ? 'cursor-zoom-out' : 'cursor-zoom-in'}`} style={{ width: magnified === index ? '220%' : '100%' }}>
                    <Image src={image.url} alt={image.alt || product.name} fill sizes={magnified === index ? '1600px' : '(min-width: 768px) 768px, 100vw'} className="object-contain" />
                  </button>
                </div>
              ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
