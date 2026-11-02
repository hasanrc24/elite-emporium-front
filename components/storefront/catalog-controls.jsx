'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowUpDown, Check, PackageSearch, SlidersHorizontal, X } from 'lucide-react';
import { browserApi } from '@/lib/api/browser-api';
import { draftCountQuery, formatNumber, normalizePriceRange, parseAttr, serializeAttr } from '@/lib/storefront';
import { formatMoney } from '@/lib/utils';
import { Sheet } from './sheet';

const SORTS = [['', 'sortFeatured'], ['newest', 'sortNewest'], ['bestselling', 'sortBestselling'], ['price_asc', 'sortPriceAsc'], ['price_desc', 'sortPriceDesc'], ['top_rated', 'sortRating']];
const sortKey = ([value, key], relevance) => (value === '' && relevance ? 'sortRelevance' : key);

// Shared with CatalogResults so the grid can show skeletons while a filter navigation is in flight.
let pending = false;
const listeners = new Set();
const setPending = (value) => { pending = value; listeners.forEach((listener) => listener()); };
export const resetFiltersPending = () => setPending(false);
const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
export const useFiltersPending = () => useSyncExternalStore(subscribe, () => pending, () => false);

function useFilterNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  return (mutate) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    next.delete('page');
    for (const [key, value] of [...next.entries()]) if (!value) next.delete(key);
    const query = next.toString();
    if (query === params.toString()) return;
    setPending(true);
    setTimeout(resetFiltersPending, 8000);
    startTransition(() => { router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }); });
  };
}

export function CatalogToolbar({ total, attributes = [], categories = [], brands = [], showCategory = true, showBrand = true, locale = 'en', relevance = false, fixed = {}, endpoint = '/products' }) {
  const t = useTranslations('Listing');
  const params = useSearchParams();
  const navigate = useFilterNavigation();
  const [open, setOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const attr = parseAttr(params.get('attr'));
  const rawSort = params.get('sort') || '';
  const sort = rawSort === 'rating' ? 'top_rated' : rawSort;
  const chips = [
    ...Object.entries(attr).flatMap(([key, values]) => values.map((value) => {
      const attribute = attributes.find((item) => item.key === key);
      const label = attribute?.values.find((item) => item.value === value)?.label || value;
      return { id: `attr-${key}-${value}`, label, remove: (next) => { const map = parseAttr(next.get('attr')); map[key] = (map[key] || []).filter((item) => item !== value); next.set('attr', serializeAttr(map)); } };
    })),
    ...(showBrand && params.get('brand') ? [{ id: 'brand', label: brands.find((item) => item.slug === params.get('brand'))?.name || params.get('brand'), remove: (next) => next.delete('brand') }] : []),
    ...(showCategory && params.get('category') ? [{ id: 'category', label: categories.find((item) => item.slug === params.get('category'))?.name || params.get('category'), remove: (next) => next.delete('category') }] : []),
    ...(params.get('minPrice') || params.get('maxPrice') ? [{ id: 'price', label: `${formatMoney(params.get('minPrice') || 0, locale)} – ${params.get('maxPrice') ? formatMoney(params.get('maxPrice'), locale) : '∞'}`, remove: (next) => { next.delete('minPrice'); next.delete('maxPrice'); } }] : []),
    ...(params.get('available') === 'true' ? [{ id: 'available', label: t('inStock'), remove: (next) => next.delete('available') }] : []),
    ...(params.get('new') === 'true' ? [{ id: 'new', label: t('newOnly'), remove: (next) => next.delete('new') }] : []),
    ...(params.get('sale') === 'true' ? [{ id: 'sale', label: t('onSale'), remove: (next) => next.delete('sale') }] : [])
  ];
  return (
    <>
      <div className="sticky top-[var(--header-height)] z-20 -mx-4 flex items-center justify-between gap-3 border-y border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 md:static md:mx-0 md:border-x-0 md:border-t-0 md:px-0 md:pb-3 md:pt-0">
        <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center gap-2 text-[14px]">
          <SlidersHorizontal size={17} aria-hidden="true" />{t('filter')}{chips.length ? <span className="grid size-5 place-items-center rounded-full bg-[var(--color-text)] text-[11px] text-[var(--color-bg)]"><span className="sr-only">{t('activeFilters', { count: chips.length })}</span><span aria-hidden="true">{formatNumber(chips.length, locale)}</span></span> : null}
        </button>
        <button type="button" onClick={() => setSortOpen(true)} className="inline-flex min-h-10 items-center gap-2 text-[14px] md:hidden">
          <ArrowUpDown size={16} aria-hidden="true" />{t('sort')}{sort ? <span className="size-1.5 rounded-full bg-[var(--color-text)]" aria-hidden="true" /> : null}
        </button>
        <p className="ml-auto text-[13px] text-[var(--color-muted)]" aria-live="polite">{t('results', { count: total })}</p>
        <label className="hidden items-center gap-2 text-[14px] md:flex">
          <span className="text-[var(--color-muted)]">{t('sort')}</span>
          <select value={sort} onChange={(event) => navigate((next) => next.set('sort', event.target.value))} className="!min-h-10 !w-auto !border-0 !bg-transparent !px-1 !py-0 font-medium !shadow-none">
            {SORTS.map((entry) => <option key={entry[0]} value={entry[0]}>{t(sortKey(entry, relevance))}</option>)}
          </select>
        </label>
      </div>
      {chips.length ? (
        <ul className="no-scrollbar mt-3 flex gap-2 overflow-x-auto" aria-label={t('filter')}>
          {chips.map((chip) => <li key={chip.id} className="shrink-0"><button type="button" onClick={() => navigate(chip.remove)} aria-label={t('remove', { label: chip.label })} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[var(--color-surface)] px-3.5 text-[13px]">{chip.label}<X size={14} /></button></li>)}
          <li className="shrink-0"><button type="button" onClick={() => navigate((next) => { for (const key of ['attr', 'category', 'brand', 'minPrice', 'maxPrice', 'available', 'sale', 'new']) if ((key !== 'category' || showCategory) && (key !== 'brand' || showBrand)) next.delete(key); })} className="min-h-9 px-2 text-[13px] underline underline-offset-4">{t('clearAll')}</button></li>
        </ul>
      ) : null}
      <FilterSheet open={open} onOpenChange={setOpen} attributes={attributes} categories={categories} brands={brands} showCategory={showCategory} showBrand={showBrand} locale={locale} total={total} fixed={fixed} endpoint={endpoint} />
      <SortSheet open={sortOpen} onOpenChange={setSortOpen} sort={sort} relevance={relevance} navigate={navigate} />
    </>
  );
}

function SortSheet({ open, onOpenChange, sort, relevance, navigate }) {
  const t = useTranslations('Listing');
  const tc = useTranslations('Common');
  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="bottom" title={t('sort')} closeLabel={tc('close')}>
      <ul className="px-2 py-2">
        {SORTS.map((entry) => (
          <li key={entry[0]}><button type="button" aria-pressed={sort === entry[0]} onClick={() => { navigate((next) => next.set('sort', entry[0])); onOpenChange(false); }} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] px-3 text-left text-[15px] hover:bg-[var(--color-surface)]"><span className={sort === entry[0] ? 'font-medium' : ''}>{t(sortKey(entry, relevance))}</span>{sort === entry[0] ? <Check size={18} aria-hidden="true" /> : null}</button></li>
        ))}
      </ul>
    </Sheet>
  );
}

function FilterSheet({ open, onOpenChange, attributes, categories, brands, showCategory, showBrand, locale, total, fixed, endpoint }) {
  const t = useTranslations('Listing');
  const tc = useTranslations('Common');
  const params = useSearchParams();
  const navigate = useFilterNavigation();
  const [draft, setDraft] = useState(null);
  // A fresh draft from the URL each time the sheet opens; applied in one navigation.
  const current = draft || {
    attr: parseAttr(params.get('attr')),
    category: params.get('category') || '',
    brand: params.get('brand') || '',
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    available: params.get('available') === 'true',
    sale: params.get('sale') === 'true',
    isNew: params.get('new') === 'true'
  };
  const update = (patch) => setDraft({ ...current, ...patch });
  const toggleAttr = (key, value) => {
    const list = current.attr[key] || [];
    update({ attr: { ...current.attr, [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] } });
  };
  function apply() {
    navigate((next) => {
      next.set('attr', serializeAttr(current.attr));
      if (showCategory) next.set('category', current.category);
      if (showBrand) next.set('brand', current.brand);
      const range = normalizePriceRange(current.minPrice, current.maxPrice);
      next.set('minPrice', range.min);
      next.set('maxPrice', range.max);
      next.set('available', current.available ? 'true' : '');
      next.set('sale', current.sale ? 'true' : '');
      next.set('new', current.isNew ? 'true' : '');
    });
    setDraft(null);
    onOpenChange(false);
  }
  // Live result count for the draft: a cheap pageSize=1 request against the same endpoint, debounced.
  const countQuery = draft ? JSON.stringify(draftCountQuery(current, fixed)) : null;
  const [fetched, setFetched] = useState({ key: null, total: null });
  useEffect(() => {
    if (!open || !countQuery) return undefined;
    let stale = false;
    const timer = setTimeout(async () => {
      try {
        const response = await browserApi.get(endpoint, { params: { ...JSON.parse(countQuery), page: 1, pageSize: 1, locale }, skipAuthRefresh: true });
        if (!stale) setFetched({ key: countQuery, total: Number(response.data?.meta?.total ?? 0) });
      } catch { /* keep the last known count; applying still works */ }
    }, 350);
    return () => { stale = true; clearTimeout(timer); };
  }, [open, countQuery, endpoint, locale]);
  const count = !draft ? total : fetched.key === countQuery ? fetched.total : null;
  const visibleAttributes = attributes.filter((attribute) => attribute.values?.length);
  return (
    <Sheet
      open={open}
      onOpenChange={(value) => { if (!value) setDraft(null); onOpenChange(value); }}
      side="right"
      title={t('filter')}
      closeLabel={tc('close')}
      footer={<div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setDraft({ attr: {}, category: '', brand: '', minPrice: '', maxPrice: '', available: false, sale: false, isNew: false })} className="min-h-12 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] text-[15px]">{t('clearAll')}</button><button type="button" onClick={apply} disabled={Boolean(draft) && count === 0} aria-live="polite" className="min-h-12 rounded-[var(--radius-sm)] bg-[var(--color-text)] text-[15px] font-medium text-[var(--color-bg)] disabled:opacity-40">{count == null || (count === 0 && !draft) ? t('applyPlain') : count === 0 ? t('applyNone') : t('apply', { count })}</button></div>}
    >
      <div className="divide-y divide-[var(--color-border)] px-5">
        {showCategory && categories.length ? (
          <FilterGroup title={t('category')}>
            <div className="flex flex-wrap gap-2">{[{ slug: '', name: t('all') }, ...categories.filter((item) => !item.parentId)].map((category) => <Pill key={category.slug || 'all'} active={current.category === category.slug} onClick={() => update({ category: category.slug })}>{category.name}</Pill>)}</div>
          </FilterGroup>
        ) : null}
        {showBrand && brands.length ? (
          <FilterGroup title={t('brand')}>
            <div className="flex flex-wrap gap-2">{[{ slug: '', name: t('all') }, ...brands].map((brand) => <Pill key={brand.slug || 'all'} active={current.brand === brand.slug} onClick={() => update({ brand: brand.slug })}>{brand.name}</Pill>)}</div>
          </FilterGroup>
        ) : null}
        {visibleAttributes.map((attribute) => (
          <FilterGroup key={attribute.key} title={attribute.label}>
            <div className="flex flex-wrap gap-2">
              {attribute.values.map((value) => {
                const active = (current.attr[attribute.key] || []).includes(value.value);
                return attribute.type === 'color' && value.colorHex
                  ? <button key={value.id} type="button" onClick={() => toggleAttr(attribute.key, value.value)} aria-pressed={active} className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-[13px] ${active ? 'border-[var(--color-text)]' : 'border-[var(--color-border-strong)]'}`}><span className="size-5 rounded-full border border-[var(--color-border-strong)]" style={{ backgroundColor: value.colorHex }} />{value.label}{active ? <Check size={14} /> : null}</button>
                  : <Pill key={value.id} active={active} onClick={() => toggleAttr(attribute.key, value.value)}>{value.label}</Pill>;
              })}
            </div>
          </FilterGroup>
        ))}
        <FilterGroup title={t('price')}>
          <div className="grid grid-cols-2 gap-3">
            <label className="field"><span>{t('min')}</span><input inputMode="numeric" pattern="[0-9]*" maxLength={7} value={current.minPrice} onChange={(event) => update({ minPrice: event.target.value })} placeholder={formatMoney(0, locale)} /></label>
            <label className="field"><span>{t('max')}</span><input inputMode="numeric" pattern="[0-9]*" maxLength={7} value={current.maxPrice} onChange={(event) => update({ maxPrice: event.target.value })} placeholder={formatMoney(10000, locale)} /></label>
          </div>
        </FilterGroup>
        <FilterGroup title={t('availability')}>
          <label className="flex min-h-10 items-center gap-3 text-[14px]"><input type="checkbox" checked={current.available} onChange={(event) => update({ available: event.target.checked })} />{t('inStock')}</label>
          <label className="flex min-h-10 items-center gap-3 text-[14px]"><input type="checkbox" checked={current.isNew} onChange={(event) => update({ isNew: event.target.checked })} />{t('newOnly')}</label>
          <label className="flex min-h-10 items-center gap-3 text-[14px]"><input type="checkbox" checked={current.sale} onChange={(event) => update({ sale: event.target.checked })} />{t('onSale')}</label>
        </FilterGroup>
      </div>
    </Sheet>
  );
}

function FilterGroup({ title, children }) {
  return <fieldset className="py-5"><legend className="mb-3 text-[14px] font-medium">{title}</legend>{children}</fieldset>;
}

function Pill({ active, onClick, children }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`min-h-10 min-w-11 rounded-[var(--radius-sm)] border px-3 text-[13px] transition ${active ? 'border-[var(--color-text)] bg-[var(--color-text)] text-[var(--color-bg)]' : 'border-[var(--color-border-strong)] hover:border-[var(--color-text)]'}`}>{children}</button>;
}

/** Zero-result state: explains why, offers to drop filters in place and suggests where to go next. */
export function ZeroResults({ locale, categories = [], query = '', filtered = false }) {
  const t = useTranslations('Listing');
  const pathname = usePathname();
  const params = useSearchParams();
  const keep = new URLSearchParams();
  if (params.get('q')) keep.set('q', params.get('q'));
  const clearHref = keep.toString() ? `${pathname}?${keep}` : pathname;
  const top = categories.filter((item) => !item.parentId).slice(0, 8);
  return (
    <div className="mt-6 grid place-items-center gap-2 py-14 text-center" role="status">
      <PackageSearch size={28} className="text-[var(--color-muted)]" aria-hidden="true" />
      <p className="text-[16px] font-medium">{query ? t('emptyForQuery', { query }) : t('emptyTitle')}</p>
      <p className="max-w-sm text-[14px] text-[var(--color-muted)]">{filtered ? t('emptyFilteredBody') : query ? t('emptySearchBody') : t('emptyBody')}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {filtered ? <Link href={clearHref} className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] bg-[var(--color-text)] px-6 text-sm text-[var(--color-bg)]">{t('clearAll')}</Link> : null}
        <Link href={`/${locale}/shop?sort=newest`} className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--color-text)] px-6 text-sm">{t('browseNew')}</Link>
      </div>
      {top.length ? (
        <div className="mt-6 grid justify-items-center gap-2">
          <p className="eyebrow">{t('tryCategories')}</p>
          <ul className="flex flex-wrap justify-center gap-2">{top.map((category) => <li key={category.id}><Link href={`/${locale}/category/${category.slug}`} className="inline-flex min-h-10 items-center rounded-full border border-[var(--color-border-strong)] px-4 text-[13px] hover:border-[var(--color-text)]">{category.name}</Link></li>)}</ul>
        </div>
      ) : null}
    </div>
  );
}
