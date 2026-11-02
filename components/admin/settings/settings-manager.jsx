'use client';

import { MetaCapiPanel } from '../meta-capi-card';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AlertTriangle, ChevronLeft, ChevronRight, CircleDot, Construction, RotateCw, Search, X } from 'lucide-react';
import { Alert, Badge, Button, ConfirmAction, ErrorState, FormattedDate, Kbd, Skeleton } from '@/components/ui';
import { apiMessage } from '@/lib/api/browser-api';
import { cn } from '@/lib/utils';
import { SettingsProvider, useSettings } from './settings-context';
import { DeliveryEstimates, DeliveryMethods } from './settings-delivery';
import { FieldList, bareInput } from './settings-fields';
import { SETTINGS_CATEGORIES, SETTINGS_SECTIONS, getPath, isEqual, searchSettings, sectionById, sectionGroups, sectionSummary } from './settings-schema';

export function SettingsLayout({ children }) {
  return (
    <SettingsProvider>
      <div className="grid gap-6 lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-8 xl:gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-[92px] grid max-h-[calc(100vh-110px)] gap-4 overflow-y-auto pb-6">
            <SettingsNav />
          </div>
        </aside>
        <div className="grid min-w-0 content-start gap-6">
          <MaintenanceNotice />
          {children}
          <SaveBar />
        </div>
      </div>
    </SettingsProvider>
  );
}

function SettingsNav() {
  const pathname = usePathname();
  const { dirtySections } = useSettings();
  const [query, setQuery] = useState('');
  return (
    <nav aria-label="Settings" className="grid gap-4">
      <div className="px-1">
        <Link href="/admin/settings" className="text-lg font-bold tracking-[-.02em] hover:text-[var(--color-primary)]">Settings</Link>
      </div>
      <SettingsSearch query={query} setQuery={setQuery} compact />
      {query.trim().length < 2 ? SETTINGS_CATEGORIES.map((category) => (
        <div key={category.id} className="grid gap-0.5">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[.08em] text-[var(--color-muted)]">{category.label}</p>
          {SETTINGS_SECTIONS.filter((section) => section.category === category.id).map((section) => {
            const href = `/admin/settings/${section.id}`;
            const active = pathname === href;
            const Icon = section.icon;
            return (
              <Link
                key={section.id}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn('group flex min-h-10 items-center gap-2.5 rounded-[var(--radius-sm)] px-3 text-sm font-medium text-[var(--color-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]', active && 'bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary-strong)]')}
              >
                <Icon size={16} aria-hidden="true" className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{section.title}</span>
                {dirtySections.has(section.id) ? <span className="size-2 shrink-0 rounded-full bg-[var(--color-warning)]" aria-label="Unsaved changes" /> : null}
              </Link>
            );
          })}
        </div>
      )) : null}
    </nav>
  );
}

function SettingsSearch({ query, setQuery, compact = false }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setFocusTarget } = useSettings();
  const results = searchSettings(query);
  const open = (result) => {
    setQuery('');
    const href = `/admin/settings/${result.section.id}`;
    if (pathname !== href) router.push(href);
    setFocusTarget({ id: result.target, at: Date.now() });
  };
  return (
    <div className="grid gap-2">
      <label className={cn('flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 transition focus-within:border-[var(--color-primary)] focus-within:shadow-[var(--shadow-focus)]', !compact && 'min-h-12 px-4')}>
        <Search size={16} className="shrink-0 text-[var(--color-muted)]" aria-hidden="true" />
        <span className="sr-only">Search settings</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter' && results[0]) { event.preventDefault(); open(results[0]); } if (event.key === 'Escape') setQuery(''); }}
          placeholder={compact ? 'Search settings' : 'Search settings, for example “guest checkout” or “VAT”'}
          className={cn(bareInput, 'px-0 [&::-webkit-search-cancel-button]:hidden')}
        />
        {query ? <button type="button" onClick={() => setQuery('')} className="rounded-full p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)]" aria-label="Clear search"><X size={14} /></button> : null}
      </label>
      {query.trim().length >= 2 ? (
        <ul className="grid gap-0.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-1 shadow-[var(--shadow-sm)]" aria-label="Search results">
          {results.length ? results.map((result) => (
            <li key={result.key}>
              <button type="button" onClick={() => open(result)} className="grid w-full gap-0.5 rounded-md px-3 py-2 text-left transition hover:bg-[var(--color-primary-soft)] focus-visible:bg-[var(--color-primary-soft)] focus-visible:outline-none">
                <span className="text-sm font-medium">{result.label}</span>
                <span className="text-xs text-[var(--color-muted)]">{result.section.title} · {result.card.title}</span>
              </button>
            </li>
          )) : <li className="px-3 py-3 text-sm text-[var(--color-muted)]">No settings match “{query.trim()}”.</li>}
        </ul>
      ) : null}
    </div>
  );
}

function MaintenanceNotice() {
  const { groups } = useSettings();
  const pathname = usePathname();
  // Saved state only: a toggled-but-unsaved switch has not closed the store yet.
  if (!groups.maintenance?.value?.enabled) return null;
  return (
    <Alert
      tone="warning"
      icon={Construction}
      title="Your storefront is in maintenance mode"
      action={pathname !== '/admin/settings/maintenance' ? <Link href="/admin/settings/maintenance" className="text-sm font-semibold underline-offset-4 hover:underline">Manage</Link> : null}
    >
      Visitors see your maintenance message and cannot place orders.
    </Alert>
  );
}

export function SettingsOverview() {
  const { values, groupsQuery, dirtySections } = useSettings();
  const [query, setQuery] = useState('');
  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-[-.035em] md:text-[1.75rem]">Settings</h1>
        <p className="max-w-2xl text-sm text-[var(--color-muted)]">Manage how your store looks, sells, ships and stays secure. Changes are validated, versioned and recorded in the audit log.</p>
      </header>
      <div className="lg:hidden"><SettingsSearch query={query} setQuery={setQuery} /></div>
      {groupsQuery.error ? <LoadError error={groupsQuery.error} onRetry={() => groupsQuery.refetch()} /> : null}
      {SETTINGS_CATEGORIES.map((category) => (
        <section key={category.id} className="grid gap-3" aria-labelledby={`settings-category-${category.id}`}>
          <h2 id={`settings-category-${category.id}`} className="text-[11px] font-semibold uppercase tracking-[.08em] text-[var(--color-muted)]">{category.label}</h2>
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {SETTINGS_SECTIONS.filter((section) => section.category === category.id).map((section) => {
              const Icon = section.icon;
              const summary = groupsQuery.data ? sectionSummary(section.id, values) : null;
              return (
                <Link key={section.id} href={`/admin/settings/${section.id}`} className="card group flex items-start gap-4 p-5 transition hover:-translate-y-px hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]"><Icon size={19} aria-hidden="true" /></span>
                  <span className="grid min-w-0 flex-1 gap-1">
                    <span className="flex items-center gap-2 text-[15px] font-semibold">
                      {section.title}
                      {dirtySections.has(section.id) ? <Badge tone="warning">Unsaved</Badge> : null}
                    </span>
                    <span className="text-[13px] leading-5 text-[var(--color-muted)]">{section.description}</span>
                    {summary ? <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text)]"><CircleDot size={12} className="text-[var(--color-muted)]" aria-hidden="true" />{summary}</span> : null}
                  </span>
                  <ChevronRight size={18} className="mt-2.5 shrink-0 text-[var(--color-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-text)]" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function SettingsSection({ sectionId }) {
  const section = sectionById(sectionId);
  const { groups, groupsQuery, focusTarget, setFocusTarget } = useSettings();
  const lastSaved = sectionGroups(section).map((group) => groups[group]?.updatedAt).filter(Boolean).sort().at(-1);

  // Scrolls to a field picked from search, or to the first invalid field after a blocked save.
  useEffect(() => {
    if (!focusTarget || groupsQuery.isLoading) return undefined;
    const frame = requestAnimationFrame(() => {
      const element = focusTarget.firstError
        ? document.querySelector('[aria-invalid="true"], [data-invalid="true"], [data-settings-failure]')?.closest('.settings-target, [data-settings-card]')
        : document.getElementById(focusTarget.id);
      if (!element) return;
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (!element.hasAttribute('data-settings-card')) element.querySelector('input:not([type=hidden]):not(:disabled), textarea:not(:disabled), button[role=switch]:not(:disabled)')?.focus({ preventScroll: true });
      element.setAttribute('data-highlight', '');
      setTimeout(() => element.removeAttribute('data-highlight'), 1600);
      setFocusTarget(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusTarget, groupsQuery.isLoading, setFocusTarget, sectionId]);

  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <Link href="/admin/settings" className="mb-1 inline-flex w-fit items-center gap-1 text-xs font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-primary)] lg:hidden"><ChevronLeft size={15} />All settings</Link>
        <h1 className="text-2xl font-bold tracking-[-.035em] md:text-[1.75rem]">{section.title}</h1>
        <p className="max-w-2xl text-sm text-[var(--color-muted)]">{section.description}</p>
        {lastSaved ? <p className="mt-1 text-xs text-[var(--color-muted)]">Last saved <FormattedDate value={lastSaved} withTime /></p> : null}
      </header>
      {groupsQuery.isLoading ? <CardSkeletons count={section.cards.length} /> : groupsQuery.error ? <LoadError error={groupsQuery.error} onRetry={() => groupsQuery.refetch()} /> : (
        <>
          {section.cards.map((card) => <SettingsCard key={card.id} card={card} />)}
        </>
      )}
    </div>
  );
}

function SettingsCard({ card }) {
  const settings = useSettings();
  const { values, groups, errorsFor, failures, reload, setValue } = settings;
  const fields = (card.fields || []).map((field) => ({ ...field, group: field.group || card.group }));
  const cardGroups = [...new Set([card.group, ...fields.map((field) => field.group)].filter(Boolean))];
  const errors = Object.fromEntries(cardGroups.map((group) => [group, errorsFor(group)]));
  const isMethods = card.kind === 'delivery-methods';
  const failureKeys = isMethods ? settings.methods.map((method) => `method:${method.id}`) : cardGroups;
  const formErrors = cardGroups.map((group) => errors[group]?._form).filter(Boolean);
  const dirty = isMethods
    ? settings.methods.some((method) => settings.isMethodDirty(method.id))
    : card.kind === 'delivery-estimates'
      ? !isEqual(values.delivery?.estimates, groups.delivery?.value?.estimates)
      : fields.some((field) => !isEqual(getPath(values[field.group], field.path), getPath(groups[field.group]?.value, field.path)));
  // A failed group can span several cards; explain it on the card(s) holding the edit.
  const cardFailures = dirty ? failureKeys.filter((key) => failures[key]).map((key) => ({ key, ...failures[key] })) : [];

  let body;
  if (isMethods) {
    body = settings.shippingQuery.isLoading ? <Skeleton className="h-40" />
      : settings.shippingQuery.error ? <LoadError error={settings.shippingQuery.error} onRetry={() => settings.shippingQuery.refetch()} compact />
      : <DeliveryMethods methods={settings.methods} zones={settings.zones} errorsFor={errorsFor} isMethodDirty={settings.isMethodDirty} setMethod={settings.setMethod} onAdd={settings.addMethod} onArchive={settings.archiveMethod} />;
  } else if (card.kind === 'delivery-estimates') {
    body = <DeliveryEstimates value={values.delivery} errors={errors.delivery || {}} setValue={setValue} methods={settings.methods} />;
  } else {
    body = <FieldList fields={fields} values={values} errors={errors} onChange={setValue} />;
  }
  // Meta Pixel and the Conversions API are one setup. The token is a secret, so it is stored encrypted
  // outside the public analytics group, but it is edited here, under the pixel it belongs to.
  const metaServerSide = card.id === 'analytics' && values.analytics?.provider === 'meta' && values.analytics?.serverSide === true;

  return (
    <section id={`card-${card.id}`} data-settings-card="" className="settings-target card overflow-visible" aria-labelledby={`card-${card.id}-title`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4 md:px-6">
        <div className="grid gap-1">
          <h2 id={`card-${card.id}-title`} className="flex items-center gap-2 text-base font-semibold tracking-[-.01em]">
            {card.title}
            {dirty ? <Badge tone="warning">Unsaved</Badge> : null}
          </h2>
          {card.description ? <p className="text-[13px] leading-5 text-[var(--color-muted)]">{card.description}</p> : null}
        </div>
      </div>
      <div className="grid gap-5 px-5 py-5 md:px-6 md:py-6">
        {cardFailures.map((failure) => (
          <Alert
            key={failure.key}
            tone={failure.conflict ? 'warning' : 'error'}
            icon={failure.conflict ? AlertTriangle : undefined}
            title={failure.conflict ? 'These settings changed elsewhere' : 'Not saved'}
            action={failure.conflict ? <Button size="sm" variant="secondary" onClick={() => reload(failure.key)}><RotateCw size={14} />Load latest</Button> : null}
          >
            <span data-settings-failure="">{failure.conflict ? 'Another admin saved this while you were editing. Load the latest version, then make your change again.' : failure.message}</span>
          </Alert>
        ))}
        {formErrors.map((message) => <Alert key={message} tone="error">{message}</Alert>)}
        {body}
        {metaServerSide ? <MetaCapiPanel /> : null}
      </div>
    </section>
  );
}

function SaveBar() {
  const { isDirty, dirtyCount, dirtySections, saving, save, discard, saveNotice } = useSettings();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  if (!isDirty) return null;
  // Only rendered after an edit, never during SSR or hydration.
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const names = SETTINGS_SECTIONS.filter((section) => dirtySections.has(section.id)).map((section) => section.title);
  return (
    <>
      <div role="region" aria-label="Unsaved changes" className="settings-savebar sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg,0.9rem)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 shadow-[var(--shadow-md)] md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {saveNotice ? <AlertTriangle size={18} className="shrink-0 text-[var(--color-danger)]" aria-hidden="true" /> : <span className="relative flex size-2.5 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-warning)] opacity-50 motion-reduce:hidden" /><span className="relative inline-flex size-2.5 rounded-full bg-[var(--color-warning)]" /></span>}
          <p className="min-w-0 text-sm" role={saveNotice ? 'alert' : 'status'}>
            {saveNotice ? <span className="font-semibold text-[var(--color-danger)]">{saveNotice}</span> : (
              <>
                <span className="font-semibold">Unsaved changes</span>
                <span className="hidden text-[var(--color-muted)] sm:inline"> · {names.length > 2 ? `${names.slice(0, 2).join(', ')} and ${names.length - 2} more` : names.join(' and ') || `${dirtyCount} card${dirtyCount === 1 ? '' : 's'}`}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled={saving} onClick={() => setConfirmDiscard(true)}>Discard</Button>
          <Button size="sm" loading={saving} onClick={() => save()}>
            Save changes
            <Kbd className="ml-1 hidden border-transparent bg-[color-mix(in_srgb,var(--color-on-primary)_18%,transparent)] text-[var(--color-on-primary)] md:inline-flex">{mac ? '⌘S' : 'Ctrl S'}</Kbd>
          </Button>
        </div>
      </div>
      <ConfirmAction
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard all unsaved changes?"
        description="Every edit you have not saved, on all settings pages, will be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={discard}
      />
    </>
  );
}

function CardSkeletons({ count }) {
  return Array.from({ length: Math.min(count, 3) }, (_, index) => (
    <div key={index} className="card grid gap-5 p-6">
      <div className="grid gap-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-72 max-w-full" /></div>
      <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-11" /><Skeleton className="h-11" /><Skeleton className="h-11" /><Skeleton className="h-11" /></div>
    </div>
  ));
}

function LoadError({ error, onRetry, compact = false }) {
  if (compact) return <Alert tone="error" action={<Button size="sm" variant="secondary" onClick={onRetry}>Retry</Button>}>{apiMessage(error, 'This could not be loaded.')}</Alert>;
  return <ErrorState title="Settings could not be loaded" description={apiMessage(error, 'Check your connection and try again.')} requestId={error?.response?.data?.requestId} action={<Button variant="secondary" onClick={onRetry}><RotateCw size={15} />Try again</Button>} />;
}
