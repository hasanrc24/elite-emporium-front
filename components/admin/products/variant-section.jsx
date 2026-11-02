'use client';

import { useMemo, useState } from 'react';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, Checkbox, ConfirmAction, Field, FormattedMoney, Input, NativeSelect } from '@/components/ui';
import { DialogContent, DialogRoot } from '@/components/ui/overlay';
import { MAX_VARIANTS, STOCK_POLICIES, applyMatrix, buildMatrixRows, combinationCount, computeMargin, diffMatrix, ensureDefaultVariant, fieldId, newVariant, slugify, syncVariationAttributes } from './product-logic';

const selectionsFrom = (attributes, picked) => attributes.filter((attribute) => picked[attribute.id]?.length).map((attribute) => ({ attribute, valueIds: picked[attribute.id] }));

/** Pricing, inventory and variants. `attributes` is the catalog attribute list (with values) for the matrix generator. */
export function VariantSection({ form, setForm, errors, attributes, attributesState, canCost }) {
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [archiving, setArchiving] = useState(null);
  const [bulk, setBulk] = useState({ regularPrice: '', salePrice: '', stock: '' });
  const err = (index, field) => errors[`variants.${index}.${field}`];
  const patchVariant = (index, patch) => setForm((current) => ({
    ...current,
    variants: current.variants.map((variant, position) => {
      if (position === index) return { ...variant, ...patch };
      return patch.isDefault ? { ...variant, isDefault: false } : variant;
    }),
  }));
  const remove = (index) => setForm((current) => ({ ...current, variants: ensureDefaultVariant(current.variants.filter((_, position) => position !== index)) }));
  const variable = form.type === 'variable';
  const atLimit = form.variants.length >= MAX_VARIANTS;

  const applyBulk = () => setForm((current) => ({
    ...current,
    variants: current.variants.map((variant) => ({
      ...variant,
      ...(bulk.regularPrice.trim() ? { regularPrice: bulk.regularPrice.trim() } : {}),
      ...(bulk.salePrice.trim() ? { salePrice: bulk.salePrice.trim() } : {}),
      ...(bulk.stock.trim() && variant.stockPolicy !== 'available' ? { initialStock: bulk.stock.trim() } : {}),
    })),
  }));

  return (
    <div className="grid gap-4">
      {errors.variants ? <Alert tone="error">{errors.variants}</Alert> : null}
      {form.archivedVariantCount ? <p className="text-xs text-[var(--color-muted)]">{form.archivedVariantCount} archived variant{form.archivedVariantCount === 1 ? ' is' : 's are'} hidden here and keep their SKUs reserved.</p> : null}
      {variable ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setMatrixOpen(true)} disabled={atLimit}><Layers size={15} /> Generate from attributes</Button>
          <Button variant="secondary" size="sm" disabled={atLimit} onClick={() => setForm((current) => ({ ...current, variants: [...current.variants, newVariant({ title: '' })] }))}><Plus size={15} /> Add variant manually</Button>
          <span className="text-xs text-[var(--color-muted)]">{form.variants.length} of {MAX_VARIANTS} variants</span>
        </div>
      ) : form.variants.length > 1 ? null : (
        <p className="text-xs text-[var(--color-muted)]">This is a simple product with one price and one stock count. Switch the type to Variable for sizes, colours and other options.</p>
      )}

      {form.variants.length > 1 ? (
        <div className="grid gap-3 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border)] p-3 sm:grid-cols-2 lg:grid-cols-[repeat(3,1fr)_auto] lg:items-end">
          <Field label="Set regular price for all"><Input inputMode="decimal" value={bulk.regularPrice} onChange={(event) => setBulk({ ...bulk, regularPrice: event.target.value })} placeholder="e.g. 1250" /></Field>
          <Field label="Set sale price for all"><Input inputMode="decimal" value={bulk.salePrice} onChange={(event) => setBulk({ ...bulk, salePrice: event.target.value })} placeholder="optional" /></Field>
          <Field label="Set stock for all"><Input inputMode="numeric" value={bulk.stock} onChange={(event) => setBulk({ ...bulk, stock: event.target.value })} placeholder="e.g. 20" /></Field>
          <Button variant="secondary" size="sm" onClick={applyBulk} disabled={!bulk.regularPrice.trim() && !bulk.salePrice.trim() && !bulk.stock.trim()}>Apply to all</Button>
        </div>
      ) : null}

      {form.variants.map((variant, index) => (
        <VariantCard
          key={variant.clientKey}
          variant={variant}
          index={index}
          total={form.variants.length}
          err={(field) => err(index, field)}
          canCost={canCost}
          onChange={(patch) => patchVariant(index, patch)}
          onRemove={() => (variant.id ? setArchiving(index) : remove(index))}
        />
      ))}

      <ConfirmAction
        open={archiving != null}
        onOpenChange={(open) => { if (!open) setArchiving(null); }}
        title="Archive this variant on save?"
        description="It is removed from the storefront and its SKU stays reserved. Orders that already include it are not affected."
        confirmLabel="Archive on save"
        onConfirm={() => { if (archiving != null) remove(archiving); }}
      />
      {matrixOpen ? (
        <MatrixDialog
          form={form}
          attributes={attributes}
          attributesState={attributesState}
          onClose={() => setMatrixOpen(false)}
          onApply={(rows, options, selections) => {
            setForm((current) => ({ ...current, variants: applyMatrix(current.variants, rows, options), attributes: syncVariationAttributes(current.attributes, selections) }));
            setMatrixOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function VariantCard({ variant, index, total, err, onChange, onRemove, canCost }) {
  const [more, setMore] = useState(false);
  const margin = useMemo(() => (canCost ? computeMargin(variant.regularPrice, variant.salePrice, variant.costPrice) : null), [canCost, variant.regularPrice, variant.salePrice, variant.costPrice]);
  const path = (field) => `variants.${index}.${field}`;
  const tracked = variant.stockPolicy !== 'available';
  const hasAdvanced = Boolean(variant.barcode || (canCost && variant.costPrice) || variant.saleStartsAt || variant.saleEndsAt || variant.weightGrams || variant.preorderAvailableAt || err('barcode') || (canCost && err('costPrice')) || err('saleEndsAt') || err('weightGrams') || err('preorderAvailableAt') || err('dimensions.lengthCm'));
  const showMore = more || hasAdvanced;
  const dims = variant.dimensions || {};
  return (
    <fieldset className="grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4">
      <legend className="flex items-center gap-2 px-2 text-sm font-bold">
        {variant.sku || `Variant ${index + 1}`}
        {variant.isDefault ? <Badge tone="primary">Default</Badge> : null}
        {!variant.id ? <Badge>New</Badge> : null}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="SKU" required htmlFor={fieldId(path('sku'))} error={err('sku')}><Input value={variant.sku} onChange={(event) => onChange({ sku: event.target.value })} placeholder="e.g. TSHIRT-BLK-S" /></Field>
        <Field label="Title" required htmlFor={fieldId(path('title'))} error={err('title')}><Input value={variant.title} onChange={(event) => onChange({ title: event.target.value })} /></Field>
        <Field label="Regular price (৳)" required htmlFor={fieldId(path('regularPrice'))} error={err('regularPrice')}><Input inputMode="decimal" value={variant.regularPrice} onChange={(event) => onChange({ regularPrice: event.target.value })} placeholder="0.00" /></Field>
        <Field label="Sale price (৳)" htmlFor={fieldId(path('salePrice'))} error={err('salePrice')}><Input inputMode="decimal" value={variant.salePrice} onChange={(event) => onChange({ salePrice: event.target.value })} placeholder="Optional" /></Field>
        <Field label="Stock policy" htmlFor={fieldId(path('stockPolicy'))} error={err('stockPolicy')}><NativeSelect value={variant.stockPolicy} onChange={(event) => onChange({ stockPolicy: event.target.value })} options={STOCK_POLICIES} /></Field>
        {tracked ? (
          <Field label="Stock on hand" htmlFor={fieldId(path('initialStock'))} error={err('initialStock')} hint={variant.id && variant.reserved != null ? `${variant.reserved} reserved by open orders` : undefined}>
            <Input inputMode="numeric" value={variant.initialStock} onChange={(event) => onChange({ initialStock: event.target.value })} />
          </Field>
        ) : null}
        <Field label="Low stock alert at" htmlFor={fieldId(path('lowStockThreshold'))} error={err('lowStockThreshold')} hint={variant.effectiveThreshold != null ? `Blank uses the default (${variant.effectiveThreshold}).` : 'Blank uses the default.'}><Input inputMode="numeric" value={variant.lowStockThreshold} onChange={(event) => onChange({ lowStockThreshold: event.target.value })} placeholder="Default" /></Field>
        <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold">
          <Checkbox checked={variant.isDefault} onCheckedChange={(value) => { if (value) onChange({ isDefault: true }); }} disabled={variant.isDefault && total === 1} />
          Default variant
        </label>
      </div>

      {margin?.profit != null ? (
        <p className="text-xs text-[var(--color-muted)]">
          Selling <FormattedMoney value={margin.selling} /> · cost <FormattedMoney value={margin.cost} /> ·{' '}
          <span className={margin.negative ? 'font-semibold text-[var(--color-danger)]' : 'font-semibold text-[var(--color-success)]'}>profit <FormattedMoney value={margin.profit} />{margin.margin != null ? ` (${margin.margin}%)` : ''}</span>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {!hasAdvanced ? <Button variant="ghost" size="sm" aria-expanded={more} onClick={() => setMore(!more)}>{more ? 'Fewer options' : 'More options'}</Button> : null}
        {total > 1 ? <Button variant="ghost" size="sm" aria-label={`${variant.id ? 'Archive' : 'Remove'} variant ${variant.sku || index + 1}`} onClick={onRemove}><Trash2 size={14} /> {variant.id ? 'Archive on save' : 'Remove'}</Button> : null}
      </div>

      {showMore ? (
        <div className="grid gap-3 border-t border-[var(--color-border)] pt-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Barcode" htmlFor={fieldId(path('barcode'))} error={err('barcode')}><Input value={variant.barcode} onChange={(event) => onChange({ barcode: event.target.value })} /></Field>
          {canCost ? <Field label="Cost price (৳)" htmlFor={fieldId(path('costPrice'))} error={err('costPrice')}><Input inputMode="decimal" value={variant.costPrice} onChange={(event) => onChange({ costPrice: event.target.value })} placeholder="Optional" /></Field> : null}
          <Field label="Sale starts" htmlFor={fieldId(path('saleStartsAt'))} error={err('saleStartsAt')}><Input type="datetime-local" value={variant.saleStartsAt} onChange={(event) => onChange({ saleStartsAt: event.target.value })} /></Field>
          <Field label="Sale ends" htmlFor={fieldId(path('saleEndsAt'))} error={err('saleEndsAt')}><Input type="datetime-local" value={variant.saleEndsAt} onChange={(event) => onChange({ saleEndsAt: event.target.value })} /></Field>
          {variant.stockPolicy === 'preorder' ? (
            <>
              <Field label="Preorder ships on" required htmlFor={fieldId(path('preorderAvailableAt'))} error={err('preorderAvailableAt')}><Input type="datetime-local" value={variant.preorderAvailableAt} onChange={(event) => onChange({ preorderAvailableAt: event.target.value })} /></Field>
              <Field label="Preorder message" htmlFor={fieldId(path('preorderMessage'))} error={err('preorderMessage')} className="sm:col-span-2"><Input value={variant.preorderMessage} maxLength={255} onChange={(event) => onChange({ preorderMessage: event.target.value })} placeholder="Ships within 10 days of the preorder date" /></Field>
            </>
          ) : null}
          <Field label="Weight (grams)" htmlFor={fieldId(path('weightGrams'))} error={err('weightGrams')}><Input inputMode="numeric" value={variant.weightGrams} onChange={(event) => onChange({ weightGrams: event.target.value })} placeholder="e.g. 350" /></Field>
          {[['lengthCm', 'Length (cm)'], ['widthCm', 'Width (cm)'], ['heightCm', 'Height (cm)']].map(([key, label]) => (
            <Field key={key} label={label} htmlFor={fieldId(path(`dimensions.${key}`))} error={err(`dimensions.${key}`)}><Input inputMode="decimal" value={dims[key] ?? ''} onChange={(event) => onChange({ dimensions: { ...dims, [key]: event.target.value } })} /></Field>
          ))}
        </div>
      ) : null}
    </fieldset>
  );
}

function MatrixDialog({ form, attributes, attributesState, onClose, onApply }) {
  const usable = useMemo(() => (attributes || []).filter((attribute) => attribute.active !== false && !attribute.archivedAt && attribute.variationCapable), [attributes]);
  const [picked, setPicked] = useState(() => {
    const used = new Set(form.variants.flatMap((variant) => variant.attributeValueIds || []));
    return Object.fromEntries(usable.map((attribute) => [attribute.id, (attribute.values || []).filter((value) => used.has(value.id)).map((value) => value.id)]));
  });
  const [skuPrefix, setSkuPrefix] = useState(() => (form.slug ? form.slug.toUpperCase() : slugify(form.translations.en.name).toUpperCase()).slice(0, 40));
  const [regularPrice, setRegularPrice] = useState(() => form.variants.find((variant) => variant.regularPrice)?.regularPrice || '');
  const [stockPolicy, setStockPolicy] = useState('deny');
  const [initialStock, setInitialStock] = useState('0');

  const selections = selectionsFrom(usable, picked);
  const total = combinationCount(selections);
  const rows = useMemo(() => buildMatrixRows(selections), [picked, usable]); // eslint-disable-line react-hooks/exhaustive-deps
  const diff = useMemo(() => diffMatrix(form.variants, rows), [form.variants, rows]);
  const resulting = form.variants.length + diff.added.length;
  const tooLarge = resulting > MAX_VARIANTS;
  const priceOk = diff.added.length === 0 || regularPrice.trim() === '' || /^\d{1,10}(\.\d{1,2})?$/.test(regularPrice.trim());
  const prefixOk = /^[A-Za-z0-9_-]*$/.test(skuPrefix);
  const canApply = diff.added.length > 0 && !tooLarge && priceOk && prefixOk && /^\d+$/.test(initialStock.trim() || 'x');

  const toggle = (attributeId, valueId) => setPicked((current) => {
    const list = current[attributeId] || [];
    return { ...current, [attributeId]: list.includes(valueId) ? list.filter((id) => id !== valueId) : [...list, valueId] };
  });

  return (
    <DialogRoot open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        size="lg"
        title="Generate variants"
        description="Pick the options this product comes in. New combinations are added; variants you already have, and any edits to them, are kept."
        footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!canApply} onClick={() => onApply(rows, { skuPrefix, regularPrice: regularPrice.trim(), stockPolicy, initialStock: initialStock.trim() }, selections)}>{diff.added.length ? `Add ${diff.added.length} variant${diff.added.length === 1 ? '' : 's'}` : 'Nothing new to add'}</Button></>}
      >
        <div className="grid gap-4">
          {attributesState?.isLoading ? <p className="text-sm text-[var(--color-muted)]">Loading attributes…</p> : null}
          {attributesState?.error ? <Alert tone="error">Attributes could not be loaded. Check that you can view the catalog attributes, then try again.</Alert> : null}
          {!attributesState?.isLoading && !attributesState?.error && !usable.length ? <Alert tone="info">No attributes can be used for variants yet. Create one (such as Size or Colour) in Catalog, Attributes.</Alert> : null}
          {usable.map((attribute) => (
            <fieldset key={attribute.id} className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3">
              <legend className="px-2 text-sm font-bold">{attribute.translations?.en?.label || attribute.key}</legend>
              <div className="flex flex-wrap gap-2">
                {(attribute.values || []).filter((value) => value.active !== false && !value.archivedAt).map((value) => {
                  const checked = (picked[attribute.id] || []).includes(value.id);
                  return (
                    <label key={value.id} className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm ${checked ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]' : 'border-[var(--color-border)]'}`}>
                      <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggle(attribute.id, value.id)} />
                      {value.colorHex ? <span aria-hidden="true" className="size-3 rounded-full border border-[var(--color-border)]" style={{ backgroundColor: value.colorHex }} /> : null}
                      {value.translations?.en?.label || value.value}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="SKU prefix" error={prefixOk ? undefined : 'Letters, numbers, dashes and underscores only.'} hint="New SKUs look like PREFIX-M-BLACK."><Input value={skuPrefix} onChange={(event) => setSkuPrefix(event.target.value.toUpperCase())} /></Field>
            <Field label="Regular price for new variants (৳)" error={priceOk ? undefined : 'Enter a price like 1250 or 1250.50.'}><Input inputMode="decimal" value={regularPrice} onChange={(event) => setRegularPrice(event.target.value)} placeholder="Set later per variant" /></Field>
            <Field label="Stock policy"><NativeSelect value={stockPolicy} onChange={(event) => setStockPolicy(event.target.value)} options={STOCK_POLICIES.filter((option) => option.value !== 'preorder')} /></Field>
            <Field label="Opening stock per new variant"><Input inputMode="numeric" value={initialStock} onChange={(event) => setInitialStock(event.target.value)} /></Field>
          </div>
          <div aria-live="polite" className="grid gap-2 text-sm">
            {total === 0 ? <p className="text-[var(--color-muted)]">Choose at least one value for each option you want to use.</p> : (
              <p><strong>{total}</strong> combination{total === 1 ? '' : 's'}: <strong>{diff.added.length}</strong> new, <strong>{diff.kept.length}</strong> already exist{diff.kept.length === 1 ? 's' : ''}.</p>
            )}
            {total > 50 && !tooLarge ? <Alert tone="warning">That is a lot of variants. Large matrices are slow to edit and to stock; consider splitting into separate products.</Alert> : null}
            {tooLarge ? <Alert tone="error">A product can have at most {MAX_VARIANTS} variants. This would make {resulting}.</Alert> : null}
            {diff.orphaned.length ? <Alert tone="info">{diff.orphaned.length} existing variant{diff.orphaned.length === 1 ? ' is' : 's are'} not in this selection ({diff.orphaned.slice(0, 4).map((variant) => variant.sku).join(', ')}{diff.orphaned.length > 4 ? '…' : ''}). They are kept; archive them from the list if they should go.</Alert> : null}
            {diff.added.length ? (
              <ul className="max-h-40 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-border)] p-2 text-xs">
                {diff.added.slice(0, 100).map((row) => <li key={row.signature} className="py-0.5">{row.title}</li>)}
                {diff.added.length > 100 ? <li className="py-0.5 text-[var(--color-muted)]">and {diff.added.length - 100} more</li> : null}
              </ul>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </DialogRoot>
  );
}
