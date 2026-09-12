'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Edit3, Eye, ShoppingBag } from 'lucide-react';
import { browserApi } from '@/lib/api/browser-api';
import { Alert, Button, Card, CardBody, CardHeader, StatusBadge } from '@/components/ui';
import { ProductEditor } from './product-editor';

export function UnifiedProductPage({ id, initialMode }) {
  const router = useRouter();
  const editorRef = useRef();
  const isNew = !id;
  const [mode, setMode] = useState(initialMode || (isNew ? 'edit' : 'view'));
  const [editorState, setEditorState] = useState({ savePending: false, saveSuccess: false, publishPending: false, isDirty: false });
  const handleActionStateChange = (state) => setEditorState(state);

  useEffect(() => {
    if (!id) return;
    const url = new URL(window.location.href);
    if (mode === 'edit') url.searchParams.set('mode', 'edit');
    else url.searchParams.delete('mode');
    window.history.replaceState({}, '', url);
  }, [id, mode]);

  const productQuery = useQuery({
    queryKey: ['admin-product', id],
    enabled: !isNew,
    queryFn: () => browserApi.get(`/admin/products/${id}`).then((response) => response.data.data),
  });

  if (isNew) {
    return (
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/products" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-primary)]"><ChevronLeft size={15} /> Back to products</Link>
            <h1 className="text-2xl font-bold tracking-[-.035em]">Add product</h1>
          </div>
          <div className="flex gap-2">
            <Button size="sm" loading={editorState.savePending} onClick={() => editorRef.current?.save()}>Create product</Button>
          </div>
        </div>
        <ProductEditor id={null} withHeader={false} ref={editorRef} onActionStateChange={handleActionStateChange} />
      </div>
    );
  }

  if (productQuery.isLoading) {
    return (
      <div className="grid gap-5">
        <div className="flex items-center gap-2">
          <Link href="/admin/products" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-primary)]"><ChevronLeft size={15} /> Back to products</Link>
        </div>
        <div className="h-8 w-48 rounded bg-[var(--color-surface-muted)]" />
        <Card><CardBody><div className="h-64 rounded bg-[var(--color-surface-muted)]" /></CardBody></Card>
      </div>
    );
  }

  if (productQuery.error) {
    return <Alert tone="error">{productQuery.error?.response?.data?.message || 'Could not load product.'}</Alert>;
  }

  const product = productQuery.data;
  const en = product.translations?.en || {};

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-primary)]"><ChevronLeft size={15} /> Back to products</Link>
          <h1 className="text-2xl font-bold tracking-[-.035em]">{en.name || product.slug}</h1>
          <StatusBadge status={product.status} />
        </div>
        <div className="flex items-center gap-2">
          {mode === 'edit' && product.status === 'published' ? (
            <Button variant="secondary" size="sm" asChild><a href={`/en/product/${product.slug}`} target="_blank" rel="noreferrer"><Eye size={15} /> Preview</a></Button>
          ) : null}
          {mode === 'view' ? (
            <Button size="sm" onClick={() => setMode('edit')}><Edit3 size={15} /> Edit product</Button>
          ) : (
            <>
              <Button variant="secondary" size="sm" loading={editorState.publishPending} onClick={() => editorRef.current?.publish()}>{product.status === 'published' ? 'Move to draft' : 'Publish'}</Button>
              <Button size="sm" loading={editorState.savePending} disabled={!editorState.isDirty} onClick={() => editorRef.current?.save()}>Save changes</Button>
            </>
          )}
        </div>
      </div>

      {mode === 'edit' ? (
        <ProductEditor id={id} withHeader={false} ref={editorRef} onActionStateChange={handleActionStateChange} />
      ) : (
        <ProductView product={product} />
      )}
    </div>
  );
}

function ProductView({ product }) {
  const en = product.translations?.en || {};
  const bn = product.translations?.bn || {};
  const variantList = product.variants || [];
  const mediaList = product.media || [];

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader title="Product overview" description="Core catalog and publication settings." />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product name (English)"><div className="mt-1 text-sm font-semibold">{en.name || '—'}</div></Field>
            <Field label="Product name (Bangla)"><div className="mt-1 text-sm font-semibold">{bn.name || '—'}</div></Field>
            <Field label="Slug"><div className="mt-1 text-sm">{product.slug || '—'}</div></Field>
            <Field label="Type"><div className="mt-1 text-sm capitalize">{product.type || '—'}</div></Field>
            <Field label="Visibility"><div className="mt-1 text-sm">{product.visibility || '—'}</div></Field>
            <Field label="Featured"><div className="mt-1 text-sm">{product.featured ? 'Yes' : 'No'}</div></Field>
            <Field label="Version"><div className="mt-1 text-sm">{product.version ?? '—'}</div></Field>
            <Field label="Status"><div className="mt-1"><StatusBadge status={product.status} /></div></Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Media" description="Product images and assets." />
        <CardBody>
          {mediaList.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {mediaList.map((item, index) => (
                <div key={`${item.mediaId}-${index}`} className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--color-border)]">
                  {item.asset?.url ? <Image src={item.asset.url} alt={item.altEn || product.slug} fill className="object-cover" /> : <div className="grid h-full w-full place-items-center text-xs text-[var(--color-muted)]">No image</div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-[var(--color-border)] text-center">
              <div>
                <ShoppingBag size={32} className="mx-auto text-[var(--color-muted)]" />
                <p className="mt-2 text-sm font-semibold">No media attached</p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Variants" description="Product variants and pricing." />
        <CardBody>
          {variantList.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)]">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--color-muted)]">SKU</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--color-muted)]">Title</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-[var(--color-muted)]">Regular</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-[var(--color-muted)]">Sale</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-[var(--color-muted)]">Cost</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-[var(--color-muted)]">Stock</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--color-muted)]">Policy</th>
                  </tr>
                </thead>
                <tbody>
                  {variantList.map((variant, index) => {
                    const inv = variant.inventory?.[0] || {};
                    return (
                      <tr key={variant.id || variant.clientKey || index} className={variant.isDefault ? 'bg-[var(--color-surface-muted)]/30' : ''}>
                        <td className="px-4 py-2 text-sm">{variant.sku || '—'}</td>
                        <td className="px-4 py-2 text-sm">{variant.title || '—'}</td>
                        <td className="px-4 py-2 text-sm text-right">{variant.regularPrice ? <FormattedMoney value={variant.regularPrice} /> : '—'}</td>
                        <td className="px-4 py-2 text-sm text-right">{variant.salePrice ? <FormattedMoney value={variant.salePrice} /> : '—'}</td>
                        <td className="px-4 py-2 text-sm text-right">{variant.costPrice ? <FormattedMoney value={variant.costPrice} /> : '—'}</td>
                        <td className="px-4 py-2 text-sm text-right">{inv.onHand ?? '—'}</td>
                        <td className="px-4 py-2 text-sm">{variant.stockPolicy || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <div className="text-sm text-[var(--color-muted)]">No variants</div>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Description" description="Customer-facing content." />
        <CardBody>
          <div className="grid gap-4 lg:grid-cols-2">
            {(['en', 'bn']).map((locale) => {
              const t = product.translations?.[locale] || {};
              return (
                <fieldset key={locale} className="grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4">
                  <legend className="px-2 font-bold">{locale === 'en' ? 'English' : 'বাংলা'}</legend>
                  <Field label="Short description"><div className="mt-1 text-sm whitespace-pre-wrap">{t.shortDescription || '—'}</div></Field>
                  <Field label="Description"><div className="mt-1 text-sm whitespace-pre-wrap">{t.description || '—'}</div></Field>
                  <Field label="Care instructions"><div className="mt-1 text-sm whitespace-pre-wrap">{t.careText || '—'}</div></Field>
                  <Field label="Materials"><div className="mt-1 text-sm whitespace-pre-wrap">{t.materialText || '—'}</div></Field>
                  <Field label="SEO title"><div className="mt-1 text-sm">{t.seoTitle || '—'}</div></Field>
                  <Field label="SEO description"><div className="mt-1 text-sm">{t.seoDescription || '—'}</div></Field>
                </fieldset>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--color-muted)]">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function FormattedMoney({ value }) {
  return <span>৳{Number(value).toFixed(2)}</span>;
}
