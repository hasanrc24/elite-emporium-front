'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Star, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { Alert, Badge, Button, Field, ImageUpload, Input, NativeSelect } from '@/components/ui';
import { DialogContent, DialogRoot } from '@/components/ui/overlay';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { useMinProductImages } from './use-min-images';
import { MAX_MEDIA, fieldId, moveItem, normalizeMedia, ratioWarning, uid } from './product-logic';

/** "Test Jamdani Kurti – image 2" */
const altFromName = (name, word, position) => `${name} – ${word} ${position}`;

const toItem = (asset, extra = {}) => ({
  key: uid(),
  mediaId: asset.id,
  role: 'gallery',
  altEn: asset.altText || '',
  altBn: '',
  variantKey: null,
  previewUrl: asset.url || null,
  width: asset.width ?? null,
  height: asset.height ?? null,
  assetStatus: asset.status || 'ready',
  ...extra,
});

export function MediaSection({ form, setForm, errors, status }) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const media = form.media;
  const minImages = useMinProductImages();
  const countable = media.filter((item) => item.role === 'primary' || item.role === 'gallery').length;
  const set = (updater) => setForm((current) => ({ ...current, media: normalizeMedia(updater(current.media)) }));
  const patch = (key, changes) => set((list) => list.map((item) => (item.key === key ? { ...item, ...changes } : item)));
  const nameEn = form.translations.en.name.trim();
  const nameBn = form.translations.bn.name.trim();
  // New images start with alt text built from the product name; staff can still edit it.
  const attach = (assets) => set((list) => {
    const have = new Set(list.map((item) => item.mediaId));
    return [...list, ...assets.filter((asset) => !have.has(asset.id)).map((asset, offset) => {
      const position = list.length + offset + 1;
      return toItem(asset, {
        altEn: asset.altText || (nameEn ? altFromName(nameEn, 'image', position) : ''),
        altBn: nameBn ? altFromName(nameBn, 'ছবি', position) : '',
      });
    })];
  });
  const missingAlt = media.filter((item) => !item.altEn && !item.altBn).length;
  const fillMissingAlt = () => set((list) => list.map((item, index) => (item.altEn || item.altBn ? item : { ...item, altEn: nameEn ? altFromName(nameEn, 'image', index + 1) : '', altBn: nameBn ? altFromName(nameBn, 'ছবি', index + 1) : '' })));
  const variantOptions = [{ value: '', label: 'All variants' }, ...form.variants.map((variant) => ({ value: variant.clientKey, label: variant.sku || variant.title || 'Unsaved variant' }))];
  const published = status === 'published' || status === 'scheduled';

  return (
    <div className="grid gap-5">
      {errors.media ? <Alert tone="error">{errors.media}</Alert> : null}
      <div className="grid gap-1 text-xs text-[var(--color-muted)]">
        <p>Use portrait <strong>3:4</strong> images, for example 1200 × 1600 px, JPEG, PNG, WebP or AVIF up to 10 MB. Other ratios are cropped on the storefront. The primary image is shown first in listings.</p>
        {countable < minImages ? <p className={published ? 'font-semibold text-[var(--color-danger)]' : 'text-[var(--color-warning)]'}>{countable ? `Add ${minImages - countable} more image${minImages - countable === 1 ? '' : 's'}: at least ${minImages} (front, back, detail) are needed to publish.` : `No images yet. A primary image and at least ${minImages} images are needed to publish.`}</p> : null}
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-semibold">Upload images</p>
        <ImageUpload
          multiple
          label=""
          max={MAX_MEDIA}
          hint="Drop images here or choose files."
          onUpload={async (file) => {
            const data = new FormData();
            data.append('file', file);
            data.append('privacy', 'public');
            const response = await browserApi.post('/admin/media/upload', data, { timeout: 60000 });
            return response.data.data;
          }}
          onChange={(assets) => attach(assets)}
        />
      </div>

      {media.length ? (
        <ol className="grid gap-3">
          {media.map((item, index) => (
            <MediaRow
              key={item.key}
              item={item}
              index={index}
              count={media.length}
              errors={errors}
              variantOptions={variantOptions}
              onPatch={(changes) => patch(item.key, changes)}
              onMove={(to) => set((list) => moveItem(list, index, to))}
              onPrimary={() => set((list) => list.map((entry) => ({ ...entry, role: entry.key === item.key ? 'primary' : entry.role === 'primary' ? 'gallery' : entry.role })))}
              onRemove={() => set((list) => list.filter((entry) => entry.key !== item.key))}
            />
          ))}
        </ol>
      ) : (
        <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-[var(--color-border)] text-center">
          <div>
            <p className="text-sm font-semibold">No images attached</p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">Upload above or choose from the media library.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setLibraryOpen(true)}>Browse media library</Button>
        {missingAlt && (nameEn || nameBn) ? <Button variant="secondary" size="sm" onClick={fillMissingAlt}>Fill {missingAlt} missing alt text from the product name</Button> : null}
      </div>
      {libraryOpen ? <LibraryDialog attached={new Set(media.map((item) => item.mediaId))} onClose={() => setLibraryOpen(false)} onAttach={(assets) => { attach(assets); setLibraryOpen(false); }} /> : null}
    </div>
  );
}

function MediaRow({ item, index, count, errors, variantOptions, onPatch, onMove, onPrimary, onRemove }) {
  const warning = ratioWarning(item);
  const processing = item.assetStatus !== 'ready';
  const poll = useQuery({
    queryKey: ['admin-media-status', item.mediaId],
    enabled: processing && item.assetStatus !== 'failed',
    refetchInterval: 3000,
    queryFn: () => browserApi.get(`/admin/media/${item.mediaId}/status`).then((response) => response.data.data),
  });
  const polled = poll.data;
  useEffect(() => {
    if (polled && polled.status !== item.assetStatus) onPatch({ assetStatus: polled.status, previewUrl: polled.url || item.previewUrl, width: polled.width ?? item.width, height: polled.height ?? item.height });
  });
  const path = (field) => `media.${index}.${field}`;
  const label = `image ${index + 1}`;
  return (
    <li className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:grid-cols-[110px_1fr_auto]">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
        {item.previewUrl ? <Image src={item.previewUrl} alt={item.altEn || `Product ${label}`} fill sizes="110px" className="object-cover" /> : <div className="grid h-full w-full place-items-center text-xs text-[var(--color-muted)]">No preview</div>}
      </div>
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {item.role === 'primary' ? <Badge tone="primary"><Star size={11} aria-hidden="true" /> Primary</Badge> : <Badge>{item.role.replace('_', ' ')}</Badge>}
          {processing ? <Badge tone="warning">{item.assetStatus === 'failed' ? 'Failed' : 'Processing…'}</Badge> : null}
          {!item.altEn && !item.altBn ? <span className="text-xs text-[var(--color-warning)]">No alt text</span> : null}
        </div>
        {errors[path('mediaId')] ? <Alert tone="error">{errors[path('mediaId')]}</Alert> : null}
        {warning ? <p className="text-xs text-[var(--color-warning)]">{warning}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Alt text (English)" htmlFor={fieldId(path('altEn'))} error={errors[path('altEn')]}><Input value={item.altEn} maxLength={500} onChange={(event) => onPatch({ altEn: event.target.value })} placeholder="Describe the image" /></Field>
          <Field label="Alt text (Bangla)" htmlFor={fieldId(path('altBn'))} error={errors[path('altBn')]}><Input value={item.altBn} maxLength={500} onChange={(event) => onPatch({ altBn: event.target.value })} placeholder="ছবির বর্ণনা" /></Field>
          <Field label="Shown for" htmlFor={fieldId(path('variantKey'))}><NativeSelect value={item.variantKey || ''} onChange={(event) => onPatch({ variantKey: event.target.value || null })} options={variantOptions} /></Field>
          <Field label="Use as" htmlFor={fieldId(path('role'))}>
            <NativeSelect
              value={item.role}
              disabled={item.role === 'primary'}
              onChange={(event) => onPatch({ role: event.target.value })}
              options={item.role === 'primary' ? [{ value: 'primary', label: 'Primary image' }] : [{ value: 'gallery', label: 'Gallery image' }, { value: 'swatch', label: 'Colour swatch' }, { value: 'size_chart', label: 'Size chart' }]}
            />
          </Field>
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-1 md:flex-col">
        <Button variant="ghost" size="sm" aria-label={`Move ${label} up`} disabled={index === 0} onClick={() => onMove(index - 1)}><ArrowUp size={14} /></Button>
        <Button variant="ghost" size="sm" aria-label={`Move ${label} down`} disabled={index === count - 1} onClick={() => onMove(index + 1)}><ArrowDown size={14} /></Button>
        {item.role !== 'primary' ? <Button variant="ghost" size="sm" aria-label={`Make ${label} the primary image`} onClick={onPrimary}><Star size={14} /></Button> : null}
        <Button variant="ghost" size="sm" aria-label={`Remove ${label}`} onClick={onRemove}><Trash2 size={14} /></Button>
      </div>
    </li>
  );
}

function LibraryDialog({ attached, onClose, onAttach }) {
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState('');
  const [chosen, setChosen] = useState([]);
  const library = useQuery({
    queryKey: ['admin-media-library', page],
    queryFn: () => browserApi.get('/admin/media', { params: { page, pageSize: 40 } }).then((response) => response.data),
  });
  const items = (library.data?.data || []).filter((asset) => asset.kind === 'image' && asset.privacy === 'public' && asset.status === 'ready' && asset.url)
    .filter((asset) => !term.trim() || `${asset.originalName || ''} ${asset.altText || ''}`.toLowerCase().includes(term.trim().toLowerCase()));
  const toggle = (asset) => setChosen((current) => (current.some((entry) => entry.id === asset.id) ? current.filter((entry) => entry.id !== asset.id) : [...current, asset]));
  const pageCount = library.data?.meta?.pageCount || 1;
  return (
    <DialogRoot open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        size="lg"
        title="Media library"
        description="Choose images to attach to this product."
        footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!chosen.length} onClick={() => onAttach(chosen)}>Attach {chosen.length || ''} selected</Button></>}
      >
        <div className="grid gap-4">
          <Field label="Search this page"><Input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="File name or alt text" /></Field>
          {library.error ? <Alert tone="error">{apiMessage(library.error, 'The media library could not be loaded. You may need the media permission.')}</Alert> : null}
          {library.isLoading ? <p className="text-sm text-[var(--color-muted)]">Loading…</p> : null}
          <ul className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
            {items.map((asset) => {
              const on = chosen.some((entry) => entry.id === asset.id);
              const already = attached.has(asset.id);
              return (
                <li key={asset.id}>
                  <label className={`relative block cursor-pointer overflow-hidden rounded-lg border focus-within:shadow-[var(--shadow-focus)] ${on ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary-soft)]' : 'border-[var(--color-border)]'} ${already ? 'opacity-50' : ''}`}>
                    <input type="checkbox" className="sr-only" checked={on} disabled={already} onChange={() => toggle(asset)} aria-label={`${asset.originalName || 'Image'}${already ? ' (already attached)' : ''}`} />
                    <span className="relative block aspect-square w-full"><Image src={asset.url} alt="" fill sizes="160px" className="object-cover" /></span>
                    {on ? <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)]"><Check size={14} aria-hidden="true" /></span> : null}
                    <span className="block truncate bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-muted)]">{already ? 'Attached' : asset.originalName || 'Unnamed'}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {!library.isLoading && !items.length ? <p className="py-6 text-center text-sm text-[var(--color-muted)]">{term ? 'No images on this page match.' : 'No ready images in the library.'}</p> : null}
          {pageCount > 1 ? (
            <div className="flex items-center justify-between text-sm">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-[var(--color-muted)]">Page {page} of {pageCount}</span>
              <Button variant="secondary" size="sm" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </DialogRoot>
  );
}
