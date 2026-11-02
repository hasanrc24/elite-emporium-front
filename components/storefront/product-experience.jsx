'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Banknote, Check, RotateCcw, Star, Truck } from 'lucide-react';
import { apiMessage } from '@/lib/api/browser-api';
import { trackCommerceEvent } from '@/lib/analytics';
import { useCart } from '@/lib/hooks/use-cart';
import { findVariant, firstMissingGroup, formatNumber, knownQuantity, initialSelection, optionGroups, selectionFromVariant, selectionSummary, selectOption, valueState, variantFromParam } from '@/lib/storefront';
import { useUiStore } from '@/lib/ui-store';
import { discountPercent, formatMoney } from '@/lib/utils';
import { ProductGallery } from './product-gallery';
import { ShareProduct } from './share-product';
import { SizeGuideButton } from './size-guide';
import { WishlistButton } from './wishlist-button';
import { deliveryEstimate, useStorefront } from './storefront-context';
import { rememberProduct } from './recently-viewed';

function imagesFor(product, variant) {
  const all = product.images || [];
  const shared = all.filter((image) => !image.variantId);
  if (!variant) return shared.length ? shared : all;
  const own = all.filter((image) => image.variantId === variant.id);
  return own.length ? [...own, ...shared] : shared.length ? shared : all;
}

export function ProductExperience({ product, locale, breadcrumb, variantParam = null }) {
  const t = useTranslations('Product');
  const router = useRouter();
  const { settings } = useStorefront();
  const groups = useMemo(() => optionGroups(product), [product]);
  const [selection, setSelection] = useState(() => {
    const requested = variantFromParam(product, variantParam);
    return requested ? selectionFromVariant(requested, groups) : initialSelection(product, groups);
  });
  const [quantity, setQuantity] = useState(1);
  const [attempted, setAttempted] = useState(false);
  const [buying, setBuying] = useState(false);
  const { add } = useCart(locale);
  const setCartOpen = useUiStore((state) => state.setCartOpen);
  const ctaRef = useRef(null);
  const [ctaState, setCtaState] = useState({ visible: true, above: false });
  const [footerVisible, setFooterVisible] = useState(false);
  const [highlight, setHighlight] = useState(null);
  const [justAdded, setJustAdded] = useState(false);

  const variant = findVariant(product.variants || [], selection, groups);
  const display = variant || product.variants?.find((item) => item.isDefault) || product.variants?.[0];
  const missing = groups.filter((group) => selection[group.key] == null);
  const purchasable = Boolean(variant?.available) && (variant.stockPolicy !== 'deny' || knownQuantity(variant) == null || knownQuantity(variant) >= quantity);
  const percent = display?.salePrice ? discountPercent(display.regularPrice, display.salePrice) : 0;
  const colorGroup = groups.find((group) => group.type === 'color');
  const galleryVariant = variant || (colorGroup && selection[colorGroup.key] ? product.variants.find((item) => String(item.attributes?.[colorGroup.key]) === selection[colorGroup.key]) : null);
  const stockLeft = knownQuantity(variant);
  const maxQuantity = variant?.stockPolicy === 'deny' && stockLeft != null ? Math.max(1, Math.min(10, stockLeft)) : 10;
  const atLimit = variant?.available && quantity >= maxQuantity;
  const range = product.priceRange;
  const showFrom = !variant && range && range.min !== range.max;
  const summary = selectionSummary(groups, selection).map((item) => (item.type === 'size' ? `${t('size')} ${item.label}` : item.label));
  // Appear only once the main button has scrolled up out of view; before that the bar would cover the
  // option rows the shopper is about to use (the default variant is preselected on load).
  const showSticky = !footerVisible && !ctaState.visible && ctaState.above;

  useEffect(() => {
    rememberProduct(product.slug);
    trackCommerceEvent('view_item', { item_id: product.id, item_name: product.name, price: display?.price, currency: 'BDT' });
  }, [product.slug, product.id, product.name, display?.price]);

  useEffect(() => {
    const node = ctaRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    // The bottom margin keeps a button hidden behind the bottom nav and buy bar from counting as visible.
    const observer = new IntersectionObserver(([entry]) => setCtaState({ visible: entry.isIntersecting, above: entry.boundingClientRect.top < 0 }), { threshold: 0, rootMargin: '0px 0px -130px 0px' });
    observer.observe(node);
    // The buy bar steps aside at the page end so it never covers the footer.
    const footer = document.querySelector('footer');
    const footerObserver = footer ? new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting), { threshold: 0 }) : null;
    if (footer) footerObserver.observe(footer);
    return () => { observer.disconnect(); footerObserver?.disconnect(); };
  }, []);

  useEffect(() => {
    if (!justAdded) return undefined;
    const timer = setTimeout(() => setJustAdded(false), 2200);
    return () => clearTimeout(timer);
  }, [justAdded]);

  useEffect(() => {
    if (!highlight) return undefined;
    const timer = setTimeout(() => setHighlight(null), 2000);
    return () => clearTimeout(timer);
  }, [highlight]);

  // Keep ?variant= in sync so a configured product can be shared or reloaded as-is.
  const variantRef = variant ? variant.sku || variant.id : null;
  useEffect(() => {
    const url = new URL(window.location.href);
    if (variantRef) url.searchParams.set('variant', variantRef); else url.searchParams.delete('variant');
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url);
  }, [variantRef]);

  function choose(key, value) {
    setSelection((current) => selectOption(product.variants || [], groups, current, key, value));
    setQuantity(1);
  }

  function focusOptions() {
    setAttempted(true);
    const group = firstMissingGroup(groups, selection);
    const target = document.getElementById(group ? `option-${group.key}` : 'product-options');
    if (!target) return;
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
    if (group) {
      setHighlight(group.key);
      target.querySelector('button:not([disabled])')?.focus({ preventScroll: true });
    }
  }

  async function submit(mode) {
    if (!variant) {
      focusOptions();
      return;
    }
    if (!purchasable) return;
    if (mode === 'buy') setBuying(true);
    try {
      await add.mutateAsync({ variantId: variant.id, quantity, productId: product.id, price: display?.price });
      if (mode === 'buy') router.push(`/${locale}/checkout`);
      else { setJustAdded(true); setCartOpen(true); }
    } catch {
      setBuying(false);
    }
  }

  const stockMessage = !variant ? null
    : !variant.available ? <span className="text-[var(--color-danger)]">{t('soldOut')}</span>
    : variant.stockPolicy === 'preorder' ? <span>{variant.preorderMessage || (variant.preorderAvailableAt ? t('preorderShips', { date: new Date(variant.preorderAvailableAt).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'long', timeZone: 'Asia/Dhaka' }) }) : t('preorder'))}</span>
    : variant.stockPolicy === 'allow_backorder' && stockLeft != null && stockLeft <= 0 ? <span>{t('backorder')}</span>
    : variant.lowStock ? <span className="text-[var(--color-warning)]">{(stockLeft != null ? t('lowStock', { count: formatNumber(stockLeft, locale) }) : t('lowStockNoCount'))}</span>
    : <span className="text-[var(--color-success)]">{t('inStock')}</span>;

  const returnDays = settings?.returns?.enabled ? settings.returns.windowDays : null;
  const methods = settings?.shippingMethods || [];

  return (
    <div className="grid items-start gap-6 md:grid-cols-[1.15fr_1fr] md:gap-10 xl:grid-cols-[1.35fr_1fr] xl:gap-16">
      <ProductGallery product={product} images={imagesFor(product, galleryVariant)} />

      <section className="md:sticky md:top-[calc(var(--header-height)+1.5rem)]" aria-labelledby="product-title">
        {breadcrumb?.items?.length ? (
          <nav aria-label={breadcrumb.label} className="mb-3 hidden text-[12px] text-[var(--color-muted)] md:block">
            <ol className="flex flex-wrap items-center gap-1.5">
              {breadcrumb.items.flatMap((crumb) => [
                <li key={crumb.key}><Link href={crumb.href} className="hover:underline">{crumb.label}</Link></li>,
                <li key={`${crumb.key}-separator`} aria-hidden="true">/</li>
              ])}
              <li aria-current="page" className="line-clamp-1 text-[var(--color-text)]">{product.name}</li>
            </ol>
          </nav>
        ) : null}
        <h1 id="product-title" className="text-[22px] font-medium leading-snug md:text-[28px]">{product.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="flex items-baseline gap-2 text-[20px] tabular-nums md:text-[22px]">
            {showFrom ? <span>{t('priceFrom', { price: formatMoney(range.min, locale) })}</span> : <span className={display?.salePrice ? 'text-[var(--color-sale)]' : ''}>{formatMoney(display?.price, locale)}</span>}
            {display?.salePrice && !showFrom ? <del className="text-[15px] text-[var(--color-muted)]">{formatMoney(display.regularPrice, locale)}</del> : null}
            {percent && !showFrom ? <span className="rounded-[3px] bg-[var(--color-sale)] px-1.5 py-0.5 text-[12px] text-white">{t('off', { percent: formatNumber(percent, locale) })}</span> : null}
          </p>
          {product.rating?.count ? <a href="#reviews" className="flex items-center gap-1 text-[13px] text-[var(--color-muted)] underline-offset-4 hover:underline"><Star size={14} fill="currentColor" className="text-[var(--color-warning)]" />{formatNumber(product.rating.average, locale, 1)} · {t('reviewCount', { count: product.rating.count })}</a> : null}
        </div>
        {variant?.sku ? <p className="mt-1 text-[12px] text-[var(--color-muted)]">{t('sku')}: <span className="tabular-nums">{variant.sku}</span></p> : null}
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{variant ? `${variant.title ? `${variant.title}. ` : ''}${formatMoney(variant.price, locale)}${variant.available ? '' : `. ${t('soldOut')}`}` : ''}</p>
        {product.shortDescription ? <p className="mt-4 text-[15px] leading-7 text-[var(--color-muted)]">{product.shortDescription}</p> : null}

        <div id="product-options" className="mt-6 grid gap-5">
          {groups.map((group) => {
            const current = selection[group.key];
            const currentLabel = group.values.find((value) => value.value === current)?.label;
            const invalid = attempted && current == null;
            return (
              <fieldset key={group.key} id={`option-${group.key}`} aria-describedby={invalid ? `${group.key}-error` : undefined} className={`scroll-mt-24 rounded-[var(--radius-sm)] transition-shadow ${highlight === group.key ? 'ring-2 ring-[var(--color-danger)] ring-offset-4 ring-offset-[var(--color-bg)]' : ''}`}>
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <legend className="text-[14px]"><span className="font-medium">{group.type === 'size' ? t('size') : group.type === 'color' ? t('colour') : group.label}</span>{currentLabel ? <span className="text-[var(--color-muted)]">: {currentLabel}</span> : null}</legend>
                  {group.type === 'size' ? <SizeGuideButton product={product} /> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.values.map((value) => {
                    const state = valueState(product.variants, selection, group.key, value.value);
                    const selected = current === value.value;
                    if (group.type === 'color' && value.colorHex)
                      return (
                        <button key={value.value} type="button" onClick={() => choose(group.key, value.value)} aria-pressed={selected} aria-label={`${value.label}${state === 'soldout' ? ` — ${t('soldOut')}` : ''}${state === 'impossible' ? ` — ${t('comboUnavailable')}` : ''}`} title={state === 'impossible' ? `${value.label} — ${t('comboUnavailable')}` : value.label} disabled={state === 'impossible'}
                          className={`relative grid size-11 place-items-center rounded-full border transition ${selected ? 'border-[var(--color-text)] ring-1 ring-[var(--color-text)] ring-offset-2' : 'border-[var(--color-border-strong)] hover:border-[var(--color-text)]'} ${state !== 'available' ? 'opacity-50' : ''}`}>
                          <span className="size-9 rounded-full border border-[var(--color-border-strong)]" style={{ backgroundColor: value.colorHex }} />
                          {state === 'soldout' ? <span aria-hidden="true" className="absolute h-px w-10 rotate-45 bg-[var(--color-text)]" /> : null}
                        </button>
                      );
                    return (
                      <button key={value.value} type="button" onClick={() => choose(group.key, value.value)} aria-pressed={selected} disabled={state === 'impossible'} title={state === 'impossible' ? t('comboUnavailable') : undefined} aria-label={`${value.label}${state === 'soldout' ? ` — ${t('soldOut')}` : ''}${state === 'impossible' ? ` — ${t('comboUnavailable')}` : ''}`}
                        className={`relative flex min-h-11 min-w-12 flex-col items-center justify-center rounded-[var(--radius-sm)] border px-3 text-[14px] leading-tight transition disabled:cursor-not-allowed disabled:opacity-30 ${selected ? 'border-[var(--color-text)] bg-[var(--color-text)] text-[var(--color-bg)]' : 'border-[var(--color-border-strong)] hover:border-[var(--color-text)]'} ${state === 'soldout' && !selected ? 'border-dashed text-[var(--color-muted)]' : ''}`}>
                        <span className={state === 'soldout' && !selected ? 'line-through decoration-1' : ''}>{value.label}</span>
                        {state === 'soldout' ? <span className="text-[10px] font-normal no-underline">{t('soldOut')}</span> : null}
                      </button>
                    );
                  })}
                </div>
                {invalid ? <p id={`${group.key}-error`} role="alert" className="mt-2 text-[13px] text-[var(--color-danger)]">{group.type === 'size' ? t('selectSize') : t('selectOption', { name: group.label })}</p> : null}
              </fieldset>
            );
          })}
          {groups.length && !missing.length && !variant ? <p role="alert" className="text-[13px] text-[var(--color-danger)]">{t('unavailable')}</p> : null}
          {!groups.some((group) => group.type === 'size') ? <SizeGuideButton product={product} className="w-max" /> : null}
        </div>

        {product.fashion?.fitNote || (product.fashion?.modelHeightCm && product.fashion?.modelSize) ? (
          <div className="mt-4 grid gap-0.5 text-[13px] text-[var(--color-muted)]">
            {product.fashion.fitNote ? <p><span className="font-medium text-[var(--color-text)]">{t('fit')}:</span> {t(`fitNotes.${product.fashion.fitNote}`)}</p> : null}
            {product.fashion.modelHeightCm && product.fashion.modelSize ? <p>{t('model', { height: formatNumber(product.fashion.modelHeightCm, locale), size: product.fashion.modelSize })}</p> : null}
          </div>
        ) : null}

        <div className="mt-6 grid gap-3" ref={ctaRef}>
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <p aria-live="polite">{stockMessage}</p>
            {variant?.available ? (
              <div className="inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-[var(--color-border-strong)]" aria-label={t('quantity')}>
                <button type="button" className="grid h-full w-11 place-items-center disabled:opacity-30" aria-label={t('decrease')} disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
                <span className="min-w-8 text-center tabular-nums" role="status" aria-label={`${t('quantity')}: ${formatNumber(quantity, locale)}`}>{formatNumber(quantity, locale)}</span>
                <button type="button" className="grid h-full w-11 place-items-center disabled:opacity-30" aria-label={t('increase')} disabled={quantity >= maxQuantity} onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}>+</button>
              </div>
            ) : null}
          </div>
          {atLimit && variant.stockPolicy === 'deny' && stockLeft != null ? <p className="text-[12px] text-[var(--color-muted)]">{t('maxQuantity', { count: maxQuantity })}</p> : null}
          <div className="flex gap-2">
            <button type="button" onClick={() => submit('add')} disabled={add.isPending || (variant && !purchasable)} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-text)] text-[15px] font-medium text-[var(--color-bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
              {add.isPending && !buying ? t('adding') : justAdded ? <><Check size={17} aria-hidden="true" />{t('addedShort')}</> : variant && !variant.available ? t('soldOut') : t('addToBag')}
            </button>
            <WishlistButton productId={product.id} variantId={variant?.id || null} locale={locale} />
          </div>
          <button type="button" onClick={() => submit('buy')} disabled={add.isPending || (variant && !purchasable)} className="min-h-12 rounded-[var(--radius-sm)] border border-[var(--color-text)] text-[15px] font-medium transition hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-40">
            {buying ? t('adding') : t('buyNow')}
          </button>
          {add.error ? <p role="alert" className="text-[13px] text-[var(--color-danger)]">{apiMessage(add.error)}</p> : null}
          {add.isSuccess && !buying ? <p role="status" className="flex items-center gap-1.5 text-[13px] text-[var(--color-success)]"><Check size={15} />{t('added')} · <button type="button" className="underline" onClick={() => setCartOpen(true)}>{t('viewBag')}</button></p> : null}
        </div>

        <ul className="mt-6 grid gap-3 border-y border-[var(--color-border)] py-5 text-[14px]">
          <li className="flex gap-3"><Banknote size={19} className="mt-0.5 shrink-0" /><span>{t('codAvailable')}</span></li>
          {methods.length ? <li className="flex gap-3"><Truck size={19} className="mt-0.5 shrink-0" /><span className="grid gap-0.5">{methods.map((method) => <span key={method.code}>{method.label?.[locale] || method.label?.en} — {formatMoney(method.price, locale)}{deliveryEstimate(settings, method.code, locale) ? <span className="text-[var(--color-muted)]"> · {deliveryEstimate(settings, method.code, locale)}</span> : null}</span>)}</span></li> : null}
          {returnDays ? <li className="flex gap-3"><RotateCcw size={19} className="mt-0.5 shrink-0" /><span>{t('returnPolicy', { days: formatNumber(returnDays, locale) })} · <Link href={`/${locale}/page/returns`} className="underline underline-offset-4">{t('details')}</Link></span></li> : null}
        </ul>
        <ShareProduct name={product.name} />
      </section>

      <div aria-hidden={!showSticky} inert={!showSticky} className={`fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-30 border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 transition-transform duration-200 motion-reduce:transition-none md:hidden ${showSticky ? 'translate-y-0' : 'pointer-events-none translate-y-[200%]'}`}>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px]">{product.name}</p>
            <p className="truncate text-[14px] font-medium tabular-nums">
              <span className={variant?.salePrice ? 'text-[var(--color-sale)]' : ''}>{showFrom ? t('priceFrom', { price: formatMoney(range.min, locale) }) : formatMoney(display?.price, locale)}</span>
              {summary.length ? <span className="font-normal text-[var(--color-muted)]"> · {summary.join(' · ')}</span> : null}
            </p>
          </div>
          <button type="button" onClick={() => (variant ? submit('add') : focusOptions())} disabled={add.isPending || (variant && !purchasable)} className="flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-text)] px-5 text-[14px] font-medium text-[var(--color-bg)] disabled:opacity-40">
            {add.isPending ? t('adding') : justAdded ? <><Check size={16} aria-hidden="true" />{t('addedShort')}</> : variant ? (variant.available ? t('addToBag') : t('soldOut')) : firstMissingGroup(groups, selection)?.type === 'size' ? t('selectSize') : t('chooseOptions')}
          </button>
        </div>
      </div>
    </div>
  );
}
