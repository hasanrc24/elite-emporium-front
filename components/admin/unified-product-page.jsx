'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArchiveRestore, ChevronLeft, Edit3, Eye, ShoppingBag } from 'lucide-react';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { Alert, Badge, Button, Card, CardBody, CardHeader, ConfirmAction, DataTable, FormattedDate, FormattedMoney, Skeleton, StatusBadge } from '@/components/ui';
import { errorToast, successToast } from '@/components/ui/toast';
import { ProductEditor } from './product-editor';
import { PublishBar } from './products/publish-bar';
import { useProductListHref } from './products/list-state';

const FIT_LABELS = { regular: 'Regular fit', slim: 'Slim fit', loose: 'Relaxed / loose', oversized: 'Oversized', runs_small: 'Runs small', true_to_size: 'True to size', runs_large: 'Runs large' };

export function UnifiedProductPage({ id, initialMode }) {
  const editorRef = useRef();
  const queryClient = useQueryClient();
  const isNew = !id;
  const permissions = useAuthStore((state) => state.user?.permissions);
  const canManage = Boolean(permissions?.includes('catalog.manage'));
  const canPublish = Boolean(permissions?.includes('catalog.publish'));
  const [mode, setMode] = useState(initialMode || (isNew ? 'edit' : 'view'));
  const [editorState, setEditorState] = useState({ savePending: false, publishPending: false, isDirty: false, status: null });
  const [confirmLeave, setConfirmLeave] = useState(false);
  // Set by a checklist "Fix" link: the editor opens at the section holding that field.
  const [focusPath, setFocusPath] = useState(null);
  const listHref = useProductListHref();

  useEffect(() => {
    if (!id) return;
    const url = new URL(window.location.href);
    if (mode === 'edit') url.searchParams.set('mode', 'edit');
    else url.searchParams.delete('mode');
    window.history.replaceState(window.history.state, '', url);
  }, [id, mode]);

  const productQuery = useQuery({
    queryKey: ['admin-product', id],
    enabled: !isNew,
    queryFn: () => browserApi.get(`/admin/products/${id}`).then((response) => response.data.data),
  });
  const restore = useMutation({
    mutationFn: () => browserApi.post(`/admin/products/${id}/restore`).then((response) => response.data.data),
    onSuccess: () => { successToast('Product restored'); queryClient.invalidateQueries({ queryKey: ['admin-product', id] }); queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }); },
    onError: (error) => errorToast('Could not restore the product', apiMessage(error)),
  });

  const back = (
    <Link href={listHref} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-primary)]"><ChevronLeft size={15} /> Back to products</Link>
  );

  if (isNew) {
    return (
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="grid gap-1">
            {back}
            <h1 className="text-2xl font-bold tracking-[-.035em]">Add product</h1>
          </div>
          {canManage ? <Button size="sm" loading={editorState.savePending} onClick={() => editorRef.current?.save()}>Create product</Button> : null}
        </div>
        {permissions && !canManage ? <Alert tone="warning">You do not have permission to create products.</Alert> : null}
        <ProductEditor id={null} ref={editorRef} onActionStateChange={setEditorState} />
      </div>
    );
  }

  if (productQuery.isLoading) {
    return (
      <div className="grid gap-5">
        {back}
        <Skeleton className="h-8 w-48" />
        <Card><CardBody><Skeleton className="h-64" /></CardBody></Card>
      </div>
    );
  }
  if (productQuery.error) return <div className="grid gap-4">{back}<Alert tone="error" action={<Button size="sm" variant="secondary" onClick={() => productQuery.refetch()}>Try again</Button>}>{apiMessage(productQuery.error, 'Could not load product.')}</Alert></div>;

  const product = productQuery.data;
  const archived = Boolean(product.archivedAt);
  const editing = mode === 'edit' && canManage && !archived;
  const status = editorState.status || product.status;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid gap-1">
          {back}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-[-.035em]">{product.translations?.en?.name || product.slug}</h1>
            <StatusBadge status={archived ? 'archived' : product.status} />
            <span className="text-xs text-[var(--color-muted)]">Version {product.version}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {product.status === 'published' && !archived ? <Button variant="secondary" size="sm" asChild><a href={`/en/product/${product.slug}`} target="_blank" rel="noreferrer"><Eye size={15} /> View on storefront</a></Button> : null}
          {archived ? (
            canManage && canPublish ? <Button size="sm" loading={restore.isPending} onClick={() => restore.mutate()}><ArchiveRestore size={15} /> Restore product</Button> : null
          ) : !editing ? (
            canManage ? <Button size="sm" onClick={() => { setFocusPath(null); setMode('edit'); }}><Edit3 size={15} /> Edit product</Button> : null
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => (editorState.isDirty ? setConfirmLeave(true) : setMode('view'))}>Back to view</Button>
              {canPublish ? <Button variant="secondary" size="sm" loading={editorState.publishPending} disabled={editorState.savePending || editorState.hasConflict} onClick={() => editorRef.current?.publish()}>{status === 'published' ? 'Move to draft' : status === 'scheduled' ? 'Publish now' : 'Publish'}</Button> : null}
              <Button size="sm" loading={editorState.savePending} disabled={!editorState.isDirty || editorState.publishPending || editorState.hasConflict} onClick={() => editorRef.current?.save()}>Save changes</Button>
            </>
          )}
        </div>
      </div>

      {archived ? <Alert tone="info" title="This product is archived">It is hidden from the storefront and cannot be edited. Restore it to make changes.</Alert> : null}

      {!editing && !archived && !isNew ? <PublishBar product={product} canPublish={canPublish} onFix={canManage ? (path) => { setFocusPath(path); setMode('edit'); } : undefined} /> : null}

      {editing ? <ProductEditor id={id} ref={editorRef} onActionStateChange={setEditorState} focusPath={focusPath} /> : <ProductView product={product} />}

      <ConfirmAction
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Discard unsaved changes?"
        description="Going back to the read-only view throws away the edits you have not saved."
        confirmLabel="Discard changes"
        onConfirm={() => { setEditorState((state) => ({ ...state, isDirty: false })); setMode('view'); }}
      />
    </div>
  );
}

const money = (key, header) => ({
  header,
  id: key,
  accessorFn: (variant) => (variant[`${key}Price`] ? Number(variant[`${key}Price`]) : null),
  meta: { align: 'right' },
  sortUndefined: 'last',
  cell: ({ row }) => (row.original[`${key}Price`] ? <FormattedMoney value={row.original[`${key}Price`]} /> : <span className="text-[var(--color-muted)]">—</span>),
});

const variantColumns = [
  {
    header: 'SKU',
    accessorKey: 'sku',
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2 font-medium">
        <span className="max-w-40 truncate" title={row.original.sku}>{row.original.sku || '—'}</span>
        {row.original.isDefault ? <Badge tone="primary">Default</Badge> : null}
        {row.original.status === 'archived' || row.original.archivedAt ? <Badge>Archived</Badge> : null}
      </span>
    ),
  },
  { header: 'Title', accessorKey: 'title', cell: ({ row }) => <span className="block max-w-56 truncate" title={row.original.title}>{row.original.title || '—'}</span> },
  money('regular', 'Regular'),
  {
    ...money('sale', 'Sale'),
    cell: ({ row }) => {
      const variant = row.original;
      if (!variant.salePrice) return <span className="text-[var(--color-muted)]">—</span>;
      return (
        <span className="grid justify-items-end">
          <FormattedMoney value={variant.salePrice} />
          {variant.saleStartsAt || variant.saleEndsAt ? <span className="text-[10px] text-[var(--color-muted)]">{variant.saleStartsAt ? <FormattedDate value={variant.saleStartsAt} /> : 'now'} to {variant.saleEndsAt ? <FormattedDate value={variant.saleEndsAt} /> : 'open'}</span> : null}
        </span>
      );
    },
  },
  money('cost', 'Cost'),
  {
    header: 'Available',
    id: 'stock',
    accessorFn: (variant) => (variant.stockPolicy === 'available' ? null : variant.inventory?.[0]?.available ?? null),
    meta: { align: 'right' },
    sortUndefined: 'last',
    cell: ({ row }) => {
      const variant = row.original;
      if (variant.stockPolicy === 'available') return <span className="text-[var(--color-muted)]">Not tracked</span>;
      const level = variant.inventory?.[0];
      if (!level) return <span className="text-[var(--color-muted)]">—</span>;
      const low = level.available <= level.lowStockThreshold;
      return <span className={`tabular-nums ${low ? 'font-semibold text-[var(--color-warning)]' : ''}`} title={`${level.onHand} on hand, ${level.reserved} reserved`}>{level.available}{low ? ' (low)' : ''}</span>;
    },
  },
  { header: 'Policy', accessorKey: 'stockPolicy', cell: ({ row }) => <span className="capitalize">{row.original.stockPolicy?.replace(/_/g, ' ') || '—'}</span> },
];

function ProductView({ product }) {
  const en = product.translations?.en || {};
  const bn = product.translations?.bn || {};
  const variantList = (product.variants || []).filter((variant) => variant.status !== 'archived' && !variant.archivedAt);
  const archivedCount = (product.variants?.length || 0) - variantList.length;
  const mediaList = product.media || [];
  const lookups = useQuery({
    queryKey: ['admin-product-view-lookups'],
    queryFn: async () => {
      const [categories, brands, collections] = await Promise.all(['categories', 'brands', 'collections'].map((kind) => browserApi.get(`/admin/${kind}`, { params: { pageSize: 100 } }).then((response) => response.data.data).catch(() => [])));
      return { categories, brands, collections };
    },
  });
  const nameOf = (list, itemId) => (list || []).find((item) => item.id === itemId)?.translations?.en?.name || null;
  const category = product.categoryId ? nameOf(lookups.data?.categories, product.categoryId) || (lookups.isLoading ? 'Loading…' : 'Unavailable') : '—';
  const brand = product.brandId ? nameOf(lookups.data?.brands, product.brandId) || (lookups.isLoading ? 'Loading…' : 'Unavailable') : '—';
  const extraCategories = (product.categoryIds || []).filter((categoryId) => categoryId !== product.categoryId).map((categoryId) => nameOf(lookups.data?.categories, categoryId) || 'Unavailable');
  const collections = (product.collectionIds || []).map((collectionId) => nameOf(lookups.data?.collections, collectionId) || 'Unavailable');
  const fashion = product.fashion || {};
  const shipping = product.shippingProfile || {};
  const localized = (key) => [fashion[key]?.en, fashion[key]?.bn].filter(Boolean).join(' / ');
  const fashionRows = [
    ['Fit', FIT_LABELS[fashion.fitType]],
    ['Sizing advice', FIT_LABELS[fashion.fitNote]],
    ['Stitching', fashion.stitched == null ? null : fashion.stitched ? 'Stitched' : 'Unstitched'],
    ['Model', fashion.modelHeightCm ? `${fashion.modelHeightCm} cm${fashion.modelSize ? `, wears ${fashion.modelSize}` : ''}` : fashion.modelSize ? `Wears ${fashion.modelSize}` : null],
    ['Set contains', localized('pieces')],
    ['Occasion', localized('occasion')],
    ['Made in', localized('origin')],
  ].filter(([, value]) => value);
  const relations = product.relations || {};

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader title="Product overview" description="Core catalog and publication settings." />
        <CardBody>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Name (English)">{en.name || '—'}</Info>
            <Info label="Name (Bangla)"><span lang="bn">{bn.name || '—'}</span></Info>
            <Info label="Slug">{product.slug || '—'}</Info>
            <Info label="Type"><span className="capitalize">{product.type || '—'}</span></Info>
            <Info label="Primary category">{category}</Info>
            <Info label="Brand">{brand}</Info>
            {extraCategories.length ? <Info label="Also in categories">{extraCategories.join(', ')}</Info> : null}
            {collections.length ? <Info label="Collections">{collections.join(', ')}</Info> : null}
            <Info label="Visibility"><span className="capitalize">{(product.visibility || '').replace(/_/g, ' ') || '—'}</span></Info>
            <Info label="Featured">{product.featured ? 'Yes' : 'No'}</Info>
            <Info label="Status"><StatusBadge status={product.status} /></Info>
            {product.status === 'scheduled' && product.publishAt ? <Info label="Goes live"><FormattedDate value={product.publishAt} withTime /></Info> : null}
            {product.publishedAt ? <Info label="First published"><FormattedDate value={product.publishedAt} withTime /></Info> : null}
            <Info label="Tax class">{product.taxClass || '—'}</Info>
            <Info label="Shipping">{shipping.requiresShipping === false ? 'No shipping needed' : shipping.freeShipping ? 'Free shipping' : 'Standard shipping'}{shipping.shippingClass ? ` (${shipping.shippingClass})` : ''}</Info>
            <Info label="Created"><FormattedDate value={product.createdAt} withTime /></Info>
            <Info label="Last updated"><FormattedDate value={product.updatedAt} withTime /></Info>
            {product.reviewCount ? <Info label="Reviews">{product.reviewAverage?.toFixed ? product.reviewAverage.toFixed(1) : product.reviewAverage} from {product.reviewCount}</Info> : null}
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Images" description={`${mediaList.length} attached. The primary image appears first in listings.`} />
        <CardBody>
          {mediaList.length ? (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {mediaList.map((item) => (
                <li key={item.id || item.mediaId} className="grid gap-1">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                    {item.asset?.url ? <Image src={item.asset.url} alt={item.altEn || product.slug} fill sizes="(min-width: 1024px) 16vw, 30vw" className="object-cover" /> : <div className="grid h-full w-full place-items-center text-xs text-[var(--color-muted)]">No image</div>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1 text-xs">
                    {item.role === 'primary' ? <Badge tone="primary">Primary</Badge> : <Badge>{item.role.replace('_', ' ')}</Badge>}
                    {item.variantId ? <span className="text-[var(--color-muted)]">{variantList.find((variant) => variant.id === item.variantId)?.sku || 'variant'}</span> : null}
                  </div>
                  {!item.altEn && !item.altBn ? <p className="text-xs text-[var(--color-warning)]">No alt text</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-[var(--color-border)] text-center">
              <div>
                <ShoppingBag size={28} className="mx-auto text-[var(--color-muted)]" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold">No images attached</p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Variants" description={`Prices in BDT and stock.${archivedCount ? ` ${archivedCount} archived variant${archivedCount === 1 ? '' : 's'} not shown.` : ''}`} />
        <CardBody>
          <DataTable columns={variantColumns} data={variantList} sortable rowKey={(variant, index) => variant.id || index} minWidth={820} caption="Product variants" emptyTitle="No variants" />
        </CardBody>
      </Card>

      {fashionRows.length ? (
        <Card>
          <CardHeader title="Fit and fashion details" description="Size confidence shown to shoppers." />
          <CardBody>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{fashionRows.map(([label, value]) => <Info key={label} label={label}>{value}</Info>)}</dl>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Content and SEO" description="Customer-facing content in English and Bangla." />
        <CardBody>
          <div className="grid gap-4 lg:grid-cols-2">
            {['en', 'bn'].map((locale) => {
              const t = product.translations?.[locale] || {};
              return (
                <fieldset key={locale} lang={locale} className="grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4">
                  <legend className="px-2 font-bold">{locale === 'en' ? 'English' : 'বাংলা (Bangla)'}</legend>
                  <Info label="Short description" block>{t.shortDescription || '—'}</Info>
                  <Info label="Description" block>{t.description || '—'}</Info>
                  <Info label="Care instructions" block>{t.careText || '—'}</Info>
                  <Info label="Materials and composition" block>{t.materialText || '—'}</Info>
                  <Info label="SEO title">{t.seoTitle || '—'}</Info>
                  <Info label="SEO description">{t.seoDescription || '—'}</Info>
                </fieldset>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {(relations.related?.length || relations.cross_sell?.length) ? (
        <Card>
          <CardHeader title="Related products" />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="You may also like">{relations.related?.length ? relations.related.map((item) => item.name).join(', ') : '—'}</Info>
              <Info label="Complete the look">{relations.cross_sell?.length ? relations.cross_sell.map((item) => item.name).join(', ') : '—'}</Info>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

function Info({ label, children, block = false }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-[var(--color-muted)]">{label}</dt>
      <dd className={`mt-1 text-sm ${block ? 'whitespace-pre-wrap' : ''}`}>{children}</dd>
    </div>
  );
}
