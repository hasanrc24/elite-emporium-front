'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import Image from 'next/image';
import { ArrowUpRight, Clock, Search, X } from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import { browserApi } from '@/lib/api/browser-api';
import { trackCommerceEvent } from '@/lib/analytics';
import { useUiStore } from '@/lib/ui-store';

const RECENT_KEY = 'ee_recent_searches';

// Recent searches are a harmless per-device convenience; storage may be blocked.
function readRecent() {
  try { return JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]').filter((value) => typeof value === 'string').slice(0, 6); } catch { return []; }
}
function writeRecent(values) {
  try { window.localStorage.setItem(RECENT_KEY, JSON.stringify(values.slice(0, 6))); } catch { /* storage unavailable */ }
}

function useDebounced(value, delay = 280) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(timer); }, [value, delay]);
  return debounced;
}

export function SearchOverlay({ locale, categories = [] }) {
  const t = useTranslations('Search');
  const router = useRouter();
  const open = useUiStore((state) => state.searchOpen);
  const setOpen = useUiStore((state) => state.setSearchOpen);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState([]);
  const [active, setActive] = useState(-1);
  const inputRef = useRef(null);
  const listId = useId();
  const term = useDebounced(query.trim());
  const suggestions = useQuery({
    queryKey: ['search-suggestions', locale, term],
    queryFn: ({ signal }) => browserApi.get('/search/suggestions', { params: { q: term, locale }, signal, skipAuthRefresh: true }).then((response) => response.data.data),
    enabled: open && term.length >= 2,
    staleTime: 60_000,
    retry: 1
  });
  const results = term.length >= 2 ? suggestions.data || [] : [];
  const expanded = term.length >= 2 && results.length > 0;

  useEffect(() => { if (open) queueMicrotask(() => { setRecent(readRecent()); setActive(-1); }); }, [open]);

  function submit(value) {
    const text = value.trim();
    if (text.length < 2) return;
    writeRecent([text, ...readRecent().filter((item) => item.toLowerCase() !== text.toLowerCase())]);
    trackCommerceEvent('search', { search_term: text });
    setOpen(false);
    router.push(`/${locale}/search?q=${encodeURIComponent(text)}`);
  }

  function onKeyDown(event) {
    if (!results.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => (index + 1) % results.length); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => (index <= 0 ? results.length - 1 : index - 1)); }
    if (event.key === 'Enter' && active >= 0) { event.preventDefault(); setOpen(false); router.push(`/${locale}/product/${results[active].slug}`); }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay fixed inset-0 z-[60] bg-[var(--color-overlay)]" />
        <Dialog.Content onOpenAutoFocus={(event) => { event.preventDefault(); inputRef.current?.focus(); }} className="animate-fade-up fixed inset-x-0 top-0 z-[61] max-h-dvh overflow-y-auto bg-[var(--color-bg)] pb-6 shadow-[var(--shadow-md)] focus:outline-none">
          <Dialog.Title className="sr-only">{t('title')}</Dialog.Title>
          <Dialog.Description className="sr-only">{t('label')}</Dialog.Description>
          <div className="container">
            <form role="search" onSubmit={(event) => { event.preventDefault(); submit(query); }} className="flex h-[var(--header-height)] items-center gap-3 border-b border-[var(--color-text)]">
              <Search size={20} aria-hidden="true" className="shrink-0" />
              <label htmlFor="site-search" className="sr-only">{t('label')}</label>
              <input
                id="site-search"
                ref={inputRef}
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                value={query}
                onChange={(event) => { setQuery(event.target.value); setActive(-1); }}
                onKeyDown={onKeyDown}
                placeholder={t('placeholder')}
                maxLength={80}
                role="combobox"
                aria-autocomplete="list"
                aria-haspopup="listbox"
                aria-expanded={expanded}
                aria-controls={expanded ? listId : undefined}
                aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                className="!min-h-0 flex-1 !border-0 !bg-transparent !p-0 !text-[17px] !shadow-none"
              />
              {query ? <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }} className="text-sm text-[var(--color-muted)]">{t('clearRecent')}</button> : null}
              <Dialog.Close className="-mr-2 grid size-11 place-items-center" aria-label={t('close')}><X size={22} /></Dialog.Close>
            </form>

            <div className="grid gap-8 pt-6 md:grid-cols-[1fr_2fr]">
              {term.length < 2 ? (
                <>
                  {recent.length ? (
                    <section>
                      <div className="flex items-center justify-between"><h2 className="eyebrow">{t('recent')}</h2><button type="button" className="text-xs underline" onClick={() => { writeRecent([]); setRecent([]); }}>{t('clearRecent')}</button></div>
                      <ul className="mt-3 grid gap-1">{recent.map((item) => <li key={item}><button type="button" onClick={() => submit(item)} className="flex min-h-10 w-full items-center gap-3 text-left text-[15px]"><Clock size={16} className="text-[var(--color-muted)]" />{item}</button></li>)}</ul>
                    </section>
                  ) : null}
                  {categories.length ? (
                    <section>
                      <h2 className="eyebrow">{t('trending')}</h2>
                      <ul className="mt-3 flex flex-wrap gap-2">{categories.map((category) => <li key={category.id}><Link href={`/${locale}/category/${category.slug}`} onClick={() => setOpen(false)} className="inline-flex min-h-10 items-center rounded-full border border-[var(--color-border-strong)] px-4 text-sm hover:border-[var(--color-text)]">{category.name}</Link></li>)}</ul>
                    </section>
                  ) : null}
                </>
              ) : (
                <section className="md:col-span-2">
                  <h2 className="eyebrow">{t('suggestions')}</h2>
                  <ul id={listId} role="listbox" aria-label={t('suggestions')} hidden={!results.length} className="mt-2 divide-y divide-[var(--color-border)]">
                    {results.map((item, index) => (
                      <li key={item.id} id={`${listId}-${index}`} role="option" aria-selected={index === active}>
                        <Link tabIndex={-1} href={`/${locale}/product/${item.slug}`} onClick={() => setOpen(false)} className={`flex min-h-14 items-center gap-3 py-1.5 text-[15px] ${index === active ? 'bg-[var(--color-surface)]' : ''}`}>
                          {item.image ? <span className="relative size-11 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-surface)]"><Image src={typeof item.image === 'string' ? item.image : item.image.url} alt="" fill sizes="44px" className="object-cover" /></span> : null}
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {item.price ? <span className="flex shrink-0 items-baseline gap-1.5 text-[14px] tabular-nums"><span className={item.onSale ? 'text-[var(--color-sale)]' : ''}>{formatMoney(item.price, locale)}</span>{item.onSale && item.regularPrice ? <del className="text-[12px] text-[var(--color-muted)]">{formatMoney(item.regularPrice, locale)}</del> : null}</span> : null}
                          <ArrowUpRight size={16} className="shrink-0 text-[var(--color-muted)]" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="sr-only" role="status" aria-live="polite">{suggestions.isFetching ? t('loading') : suggestions.isError ? t('suggestionsError') : t('suggestionCount', { count: results.length })}</p>
                  {suggestions.isFetching && !results.length ? <div className="mt-3 grid gap-3" aria-hidden="true"><div className="skeleton h-5 w-2/3 rounded" /><div className="skeleton h-5 w-1/2 rounded" /></div> : null}
                  {!suggestions.isFetching && suggestions.isError ? <p className="mt-3 text-sm text-[var(--color-danger)]">{t('suggestionsError')}</p> : null}
                  {!suggestions.isFetching && !suggestions.isError && !results.length ? <p className="mt-3 text-sm text-[var(--color-muted)]">{t('noSuggestions')}</p> : null}
                  <button type="button" onClick={() => submit(query)} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium underline underline-offset-4">{t('viewAll', { query: query.trim() })}</button>
                </section>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
