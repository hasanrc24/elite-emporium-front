'use client';

import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Eye, FileText, ImageIcon, LayoutGrid, List, Lock, Trash2, Upload } from 'lucide-react';
import { Alert, Button, ConfirmAction, CopyButton, DataTable, DialogContent, DialogRoot, Field, Input, NativeSelect, Skeleton, TableFooter, actionsColumn, pushToast } from '@/components/ui';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { useSearchInput, useTableParams } from '@/lib/hooks/use-table-params';
import { AdminPageHeader } from './admin-page-header';
import { formatDateTime, useCan } from './orders/order-shared';

const DEFAULTS = { page: 1, pageSize: 24, search: '', kind: '', status: 'active' };
const KEY = ['admin', 'media-library'];
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,application/pdf';
const USAGE_LABELS = { productMedia: 'product', categories: 'category', collections: 'collection', brands: 'brand', attributeValues: 'attribute swatch', shipments: 'shipment label', posts: 'blog post', exports: 'export', reviews: 'review', returns: 'return', homepage: 'homepage section', settings: 'store setting (such as the logo)', theme: 'theme' };

const VIEW_KEY = 'ee-media-view';
// A table (small preview, name, size, date) suits managing many files; the grid stays one click away.
const readView = () => { try { return window.localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'list'; } catch { return 'list'; } };

const formatSize = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

function Thumb({ asset, large = false }) {
  const box = large ? 'h-64 w-full' : 'aspect-square w-full';
  if (asset.kind === 'image' && asset.url) return <div role="img" aria-label={asset.altText || asset.originalName} className={`${box} bg-[var(--color-surface)] bg-contain bg-center bg-no-repeat`} style={{ backgroundImage: `url("${asset.url}")` }} />;
  const Icon = asset.kind === 'image' ? Lock : FileText;
  return <div className={`${box} grid place-items-center bg-[var(--color-surface)] text-[var(--color-muted)]`}><Icon size={large ? 40 : 28} aria-hidden="true" /><span className="sr-only">{asset.kind === 'image' ? 'Private image' : 'Document'}</span></div>;
}

/** Uploads one or more files straight into the library; failures are listed, successes are kept. */
function UploadBar({ onDone }) {
  const [privacy, setPrivacy] = useState('public');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState([]);
  async function upload(files) {
    if (!files.length) return;
    setBusy(true); setErrors([]);
    const failed = [];
    let ok = 0;
    for (const file of files) {
      const data = new FormData();
      data.append('file', file); data.append('privacy', privacy); data.append('altText', '');
      try { await browserApi.post('/admin/media/upload', data); ok += 1; } catch (error) { failed.push(`${file.name}: ${apiMessage(error, 'could not be uploaded')}`); }
    }
    setBusy(false); setErrors(failed);
    if (ok) { pushToast({ tone: 'success', title: `${ok} file${ok === 1 ? '' : 's'} uploaded` }); onDone(); }
  }
  return (
    <div className="admin-card grid gap-3 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-5 text-sm font-semibold text-[var(--color-on-primary)]">
          <Upload size={16} aria-hidden="true" />{busy ? 'Uploading…' : 'Upload files'}
          <input type="file" multiple accept={ACCEPT} className="sr-only" disabled={busy} onChange={(event) => { const files = [...event.target.files]; event.target.value = ''; upload(files); }} />
        </label>
        <Field label="Who can see new uploads" className="min-w-52">
          <NativeSelect value={privacy} onChange={(event) => setPrivacy(event.target.value)} options={[{ value: 'public', label: 'Public (storefront images)' }, { value: 'private', label: 'Private (staff only)' }]} />
        </Field>
        <p className="pb-2 text-xs text-[var(--color-muted)]">JPG, PNG, WebP, AVIF or PDF. Privacy cannot be changed later.</p>
      </div>
      {errors.map((message) => <Alert key={message} tone="error">{message}</Alert>)}
    </div>
  );
}

function AssetDialog({ asset, onClose, onChanged }) {
  const client = useQueryClient();
  const [alt, setAlt] = useState(asset.altText || '');
  const [confirming, setConfirming] = useState(false);
  const usage = useQuery({ queryKey: [...KEY, 'usage', asset.id], queryFn: () => browserApi.get(`/admin/media/${asset.id}/usage`).then((response) => response.data.data) });
  const save = useMutation({
    mutationFn: () => browserApi.patch(`/admin/media/${asset.id}`, { altText: alt.trim() || null }),
    onSuccess: () => { pushToast({ tone: 'success', title: 'Description saved' }); client.invalidateQueries({ queryKey: KEY }); onChanged(); },
    onError: (error) => pushToast({ tone: 'error', title: 'Could not save', description: apiMessage(error) })
  });
  const remove = useMutation({
    mutationFn: () => browserApi.delete(`/admin/media/${asset.id}`),
    onSuccess: () => { pushToast({ tone: 'success', title: 'File deleted', description: asset.originalName }); onChanged(); onClose(); },
    onError: (error) => { setConfirming(false); pushToast({ tone: 'error', title: 'Could not delete', description: apiMessage(error) }); }
  });
  const used = Object.entries(usage.data?.usages || {}).filter(([, count]) => count > 0).map(([key, count]) => `${count} ${USAGE_LABELS[key] || key}${count === 1 ? '' : 's'}`);
  const archived = asset.status === 'archived';
  return (
    <DialogRoot open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent title={asset.originalName} description={`${asset.kind === 'image' ? 'Image' : 'Document'} · ${formatSize(asset.byteSize)}${asset.width ? ` · ${asset.width}×${asset.height}` : ''} · ${asset.privacy === 'public' ? 'Public' : 'Private'} · uploaded ${formatDateTime(asset.createdAt)}`}>
        <div className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)]"><Thumb asset={asset} large /></div>
        {asset.url ? (
          <div className="flex items-center gap-2">
            <Input readOnly value={asset.url} aria-label="File address" onFocus={(event) => event.target.select()} />
            <CopyButton value={asset.url} label="Copy link" />
          </div>
        ) : <p className="text-sm text-[var(--color-muted)]">This file is private, so it has no public link.</p>}
        {asset.kind === 'image' ? (
          <div className="grid gap-2">
            <Field label="Description (alt text)" hint="Read aloud to people who cannot see the picture. Also helps search engines.">
              <Input value={alt} maxLength={500} disabled={archived} onChange={(event) => setAlt(event.target.value)} />
            </Field>
            <div><Button size="sm" loading={save.isPending} disabled={archived || alt.trim() === (asset.altText || '')} onClick={() => save.mutate()}>Save description</Button></div>
          </div>
        ) : null}
        <div className="text-sm">
          <p className="font-semibold">Where it is used</p>
          {usage.isLoading ? <Skeleton className="mt-1 h-5 w-48" /> : used.length ? <p className="text-[var(--color-muted)]">{used.join(', ')}</p> : <p className="text-[var(--color-muted)]">Not used anywhere.</p>}
        </div>
        {!archived ? (
          confirming ? (
            <Alert tone="warning" title={`Delete “${asset.originalName}”?`} action={<div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>Keep</Button><Button size="sm" variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>Delete</Button></div>}>It disappears from the library. Pages that still point at its link keep working until you replace them.</Alert>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="danger" disabled={usage.isLoading || usage.data?.inUse} onClick={() => setConfirming(true)}><Trash2 size={16} />Delete file</Button>
              {usage.data?.inUse ? <span className="text-xs text-[var(--color-muted)]">In use. Remove it from {used.join(', ')} first.</span> : null}
            </div>
          )
        ) : <Alert tone="info">This file was deleted.</Alert>}
      </DialogContent>
    </DialogRoot>
  );
}

export function MediaLibrary() {
  const client = useQueryClient();
  const can = useCan();
  const [{ page, pageSize, search, kind, status }, setParams] = useTableParams(DEFAULTS);
  const [searchText, setSearchText] = useSearchInput(search, (value) => setParams({ search: value }));
  const [selected, setSelected] = useState(null);
  // Files ticked for a bulk delete; kept while paging, cleared when the filters change.
  const [checked, setChecked] = useState({});
  const [confirmBulk, setConfirmBulk] = useState(false);
  // Grid is best for picking by picture, list for names, sizes and dates; the choice is remembered.
  const [view, setViewState] = useState('grid');
  // Read after mount so the server and first client render agree.
  useEffect(() => { queueMicrotask(() => setViewState(readView())); }, []);
  const setView = (next) => { setViewState(next); try { window.localStorage.setItem(VIEW_KEY, next); } catch { /* preference is optional */ } };
  const [bulkSkipped, setBulkSkipped] = useState([]);
  const list = useQuery({
    queryKey: [...KEY, page, pageSize, search, kind, status],
    queryFn: () => browserApi.get('/admin/media', { params: { page, pageSize, search: search || undefined, kind: kind || undefined, status } }).then((response) => response.data),
    placeholderData: keepPreviousData
  });
  const rows = list.data?.data || [];
  const meta = list.data?.meta || {};
  const refresh = () => client.invalidateQueries({ queryKey: KEY });
  const filtered = Boolean(search || kind || status !== 'active');
  const checkedIds = Object.keys(checked);
  const allOnPage = rows.length > 0 && rows.every((asset) => checked[asset.id]);
  const canDelete = can('media.manage') && status === 'active';
  const toggle = (asset) => setChecked((current) => { const { [asset.id]: removed, ...rest } = current; return removed ? rest : { ...rest, [asset.id]: asset.originalName }; });
  const togglePage = () => setChecked((current) => {
    if (allOnPage) { const next = { ...current }; for (const asset of rows) delete next[asset.id]; return next; }
    return { ...current, ...Object.fromEntries(rows.map((asset) => [asset.id, asset.originalName])) };
  });
  const columns = useMemo(() => [
    { id: 'file', header: 'File', cell: ({ row: { original: asset } }) => (
      <div className="flex min-w-0 items-center gap-3">
        <div className="size-10 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)]"><Thumb asset={asset} /></div>
        <div className="min-w-0"><p className="truncate font-medium" title={asset.originalName}>{asset.originalName}</p>{asset.kind === 'image' && !asset.altText ? <p className="text-xs text-[var(--color-muted)]">No description</p> : null}</div>
      </div>
    ) },
    { id: 'type', header: 'Type', cell: ({ row: { original: asset } }) => <span className="whitespace-nowrap capitalize">{asset.kind}{asset.width ? ` · ${asset.width}×${asset.height}` : ''}</span> },
    { id: 'size', header: 'Size', cell: ({ row: { original: asset } }) => <span className="whitespace-nowrap tabular-nums">{formatSize(asset.byteSize)}</span> },
    { id: 'privacy', header: 'Who can see it', cell: ({ row: { original: asset } }) => <span>{asset.privacy === 'public' ? 'Public' : 'Staff only'}</span> },
    { id: 'uploaded', header: 'Uploaded', cell: ({ row: { original: asset } }) => <span className="whitespace-nowrap text-xs text-[var(--color-muted)]">{formatDateTime(asset.createdAt)}</span> },
    actionsColumn((asset) => [
      { label: 'Details and description', icon: Eye, onSelect: () => setSelected(asset) },
      { label: 'Copy link', icon: Copy, hidden: !asset.url, onSelect: () => navigator.clipboard.writeText(asset.url).then(() => pushToast({ tone: 'success', title: 'Link copied', duration: 1800 }), () => pushToast({ tone: 'error', title: 'Could not copy' })) },
      { label: 'Delete', icon: Trash2, hidden: !canDelete, onSelect: () => deleteFiles([asset.id]), confirm: { title: `Delete “${asset.originalName}”?`, description: 'It disappears from the library. If it is still used on a product, page or the homepage it is kept and you are told where.', confirmLabel: 'Delete' } }
    ], { label: (asset) => `Actions for ${asset.originalName}` })
  ], [canDelete]); // eslint-disable-line react-hooks/exhaustive-deps
  const deleteFiles = (ids) => bulkDelete.mutate(ids);
  const changeFilter = (patch) => { setChecked({}); setBulkSkipped([]); setParams(patch); };
  const bulkDelete = useMutation({
    mutationFn: (ids) => browserApi.post('/admin/media/bulk-delete', { ids }).then((response) => response.data.data),
    onSuccess: (result) => {
      setBulkSkipped(result.skipped.map((item) => item.name || item.id));
      // Deleted files leave the selection; files still in use stay ticked so they are easy to review.
      setChecked((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !result.archived.includes(id))));
      if (result.archived.length) pushToast({ tone: 'success', title: `${result.archived.length} file${result.archived.length === 1 ? '' : 's'} deleted` });
      refresh();
    },
    onError: (error) => pushToast({ tone: 'error', title: 'Could not delete', description: apiMessage(error) })
  });

  return (
    <div className="grid gap-5">
      <AdminPageHeader title="Media library" description="Every picture and PDF you upload lives here. Click a file to copy its link, edit its description, see where it is used, or delete it." />
      {can('media.manage') ? <UploadBar onDone={refresh} /> : null}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Search" className="min-w-56 flex-1 sm:max-w-sm"><Input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search by file name…" /></Field>
        <Field label="Type" className="min-w-40"><NativeSelect value={kind} onChange={(event) => changeFilter({ kind: event.target.value })} options={[{ value: '', label: 'All files' }, { value: 'image', label: 'Images' }, { value: 'document', label: 'Documents' }]} /></Field>
        <Field label="Show" className="min-w-40"><NativeSelect value={status} onChange={(event) => changeFilter({ status: event.target.value })} options={[{ value: 'active', label: 'Current files' }, { value: 'archived', label: 'Deleted files' }]} /></Field>
        <div role="group" aria-label="Layout" className="ml-auto flex overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border-strong)]">
          <button type="button" aria-pressed={view === 'grid'} onClick={() => setView('grid')} className={`inline-flex min-h-10 items-center gap-1.5 px-3 text-sm font-medium ${view === 'grid' ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'bg-[var(--color-surface-raised)]'}`}><LayoutGrid size={15} aria-hidden="true" />Grid</button>
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')} className={`inline-flex min-h-10 items-center gap-1.5 border-l border-[var(--color-border-strong)] px-3 text-sm font-medium ${view === 'list' ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'bg-[var(--color-surface-raised)]'}`}><List size={15} aria-hidden="true" />List</button>
        </div>
        {filtered ? <Button size="sm" variant="ghost" onClick={() => { setSearchText(''); changeFilter({ search: '', kind: '', status: 'active' }); }}>Clear filters</Button> : null}
      </div>
      {canDelete && checkedIds.length ? (
        <div role="region" aria-label="Selected files" className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-4 py-3 shadow-[var(--shadow-md)]">
          <span className="text-sm font-semibold">{checkedIds.length} selected</span>
          <Button size="sm" variant="ghost" onClick={togglePage}>{allOnPage ? 'Unselect this page' : 'Select all on this page'}</Button>
          <Button size="sm" variant="ghost" onClick={() => { setChecked({}); setBulkSkipped([]); }}>Clear</Button>
          <Button size="sm" variant="danger" className="ml-auto" loading={bulkDelete.isPending} onClick={() => setConfirmBulk(true)}><Trash2 size={15} />Delete selected</Button>
        </div>
      ) : null}
      <ConfirmAction open={confirmBulk} onOpenChange={setConfirmBulk} title={`Delete ${checkedIds.length} file${checkedIds.length === 1 ? '' : 's'}?`} description="They disappear from the library. Files that are still used on a product, page or the homepage are skipped and listed for you." confirmLabel="Delete" onConfirm={() => deleteFiles(checkedIds)} />
      {bulkSkipped.length ? <Alert tone="warning" title={`${bulkSkipped.length} file${bulkSkipped.length === 1 ? ' was' : 's were'} not deleted because ${bulkSkipped.length === 1 ? 'it is' : 'they are'} still in use`}>{bulkSkipped.slice(0, 8).join(', ')}{bulkSkipped.length > 8 ? `, and ${bulkSkipped.length - 8} more` : ''}. Open a file to see where it is used.</Alert> : null}
      {list.error ? <Alert tone="error">{apiMessage(list.error, 'The library could not be loaded.')} <Button size="sm" variant="secondary" onClick={() => list.refetch()}>Retry</Button></Alert> : null}
      {view === 'grid' && list.isLoading ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 12 }).map((_, index) => <Skeleton key={index} className="aspect-square" />)}</div> : null}
      {view === 'list' ? (
        <DataTable
          caption="Media library"
          columns={columns}
          data={rows}
          loading={list.isLoading}
          fetching={list.isFetching}
          error={null}
          minWidth={680}
          onRowClick={(asset) => setSelected(asset)}
          rowLabel={(asset) => `Open ${asset.originalName}`}
          selectedIds={canDelete ? checkedIds : undefined}
          onSelectedIdsChange={canDelete ? (ids) => setChecked(Object.fromEntries(ids.map((id) => [id, checked[id] || rows.find((asset) => asset.id === id)?.originalName || id]))) : undefined}
          emptyTitle={filtered ? 'No files match' : 'No files yet'}
          emptyDescription={filtered ? 'Try another search or clear the filters.' : 'Upload pictures and PDFs with the button above.'}
        />
      ) : null}
      {view === 'grid' && !list.isLoading && !rows.length ? (
        <div className="admin-card grid place-items-center gap-2 p-10 text-center"><ImageIcon size={28} className="text-[var(--color-muted)]" aria-hidden="true" /><p className="font-medium">{filtered ? 'No files match' : 'No files yet'}</p><p className="text-sm text-[var(--color-muted)]">{filtered ? 'Try another search or clear the filters.' : 'Upload pictures and PDFs with the button above.'}</p></div>
      ) : null}
      {view === 'grid' ? <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {rows.map((asset) => (
          <li key={asset.id} className="relative">
            {canDelete ? <input type="checkbox" aria-label={`Select ${asset.originalName}`} checked={Boolean(checked[asset.id])} onChange={() => toggle(asset)} className="absolute left-2 top-2 z-[1] !size-5 !min-h-0 cursor-pointer !p-0 accent-[var(--color-primary)]" /> : null}
            <button type="button" onClick={() => setSelected(asset)} className={`group grid w-full overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-left transition hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] ${checked[asset.id] ? 'ring-2 ring-[var(--color-primary)]' : ''}`}>
              <Thumb asset={asset} />
              <span className="grid gap-0.5 p-2.5">
                <span className="truncate text-[13px] font-medium" title={asset.originalName}>{asset.originalName}</span>
                <span className="text-xs text-[var(--color-muted)]">{formatSize(asset.byteSize)}{asset.privacy === 'private' ? ' · Private' : ''}{asset.kind === 'image' && !asset.altText ? ' · No description' : ''}</span>
              </span>
            </button>
          </li>
        ))}
      </ul> : null}
      {meta.total ? <TableFooter page={page} pageSize={pageSize} total={meta.total} pageCount={meta.pageCount} onPageChange={(next) => setParams({ page: next })} onPageSizeChange={(size) => setParams({ pageSize: size })} /> : null}
      {selected ? <AssetDialog key={selected.id} asset={selected} onClose={() => setSelected(null)} onChanged={refresh} /> : null}
    </div>
  );
}
