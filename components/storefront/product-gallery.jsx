'use client';

import Image from 'next/image';
import { useState } from 'react';

export function ProductGallery({ product }) {
  const images = product.images || [];
  const [active, setActive] = useState(0);
  const current = images[active] || images[0];

  return <section className="product-gallery grid gap-3 sm:grid-cols-[84px_1fr]" aria-label={`${product.name} images`}>
    <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:flex-col">
      {images.slice(0, 8).map((image, index) => <button type="button" key={image.id} onClick={() => setActive(index)} aria-label={`Show image ${index + 1} of ${images.length}`} aria-pressed={index === active} className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border-2 bg-[var(--color-surface-muted)] transition sm:w-[76px] ${index === active ? 'border-[var(--color-primary)]' : 'border-transparent opacity-70 hover:opacity-100'}`}><Image src={image.url} alt={image.alt || product.name} fill sizes="76px" className="object-cover" /></button>)}
    </div>
    <div className="order-1 relative aspect-[4/5] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-muted)] sm:order-2">
      {current ? <Image src={current.url} alt={current.alt || product.name} fill priority sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover" /> : <div className="grid h-full place-items-center text-center text-3xl font-bold tracking-[-.05em] text-[var(--color-primary)]/35">ELITE<br />EMPORIUM</div>}
      {images.length > 1 ? <span className="absolute bottom-4 right-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold text-[var(--color-text)]">{active + 1} / {images.length}</span> : null}
    </div>
  </section>;
}
