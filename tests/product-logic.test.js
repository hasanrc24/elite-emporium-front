import { describe, expect, it } from 'vitest';
import {
  applyMatrix,
  buildMatrixRows,
  buildPayload,
  computeMargin,
  dayBoundIso,
  describeServerChanges,
  diffMatrix,
  emptyProduct,
  labelForPath,
  mapFieldErrors,
  newVariant,
  normalizeMedia,
  normalizeProduct,
  publishBlockers,
  publishReadiness,
  rebaseOnto,
  sectionForPath,
  snapshotOf,
  startingPrice,
  validateProduct,
} from '../components/admin/products/product-logic';

const sizeAttribute = { id: 'A'.repeat(26), key: 'size', values: [{ id: 'S'.repeat(26), slug: 's', value: 'S' }, { id: 'M'.repeat(26), slug: 'm', value: 'M' }, { id: 'L'.repeat(26), slug: 'l', value: 'L' }] };
const colourAttribute = { id: 'C'.repeat(26), key: 'colour', values: [{ id: 'B'.repeat(26), slug: 'black', value: 'Black', translations: { en: { label: 'Jet Black' } } }] };

const dto = (overrides = {}) => ({
  id: 'P'.repeat(26),
  slug: 'shirt',
  type: 'variable',
  status: 'draft',
  version: 4,
  categoryId: 'K'.repeat(26),
  translations: { en: { name: 'Shirt' }, bn: { name: 'শার্ট' } },
  variants: [
    { id: 'V1'.padEnd(26, 'x'), version: 2, sku: 'SH-S', title: 'S', regularPrice: '1200.00', salePrice: null, costPrice: '700.00', stockPolicy: 'deny', status: 'active', isDefault: true, attributeValueIds: ['S'.repeat(26)], lowStockThreshold: null, inventory: [{ onHand: 10, reserved: 2, available: 8, lowStockThreshold: 5 }] },
    { id: 'V2'.padEnd(26, 'x'), version: 1, sku: 'SH-OLD', title: 'Old', regularPrice: '900.00', stockPolicy: 'deny', status: 'archived', archivedAt: '2026-01-01', isDefault: false, inventory: [] },
  ],
  media: [
    { id: 'm1', mediaId: 'X'.repeat(26), role: 'gallery', variantId: null, asset: { url: '/a.jpg', width: 1200, height: 1600, status: 'ready' } },
    { id: 'm2', mediaId: 'Y'.repeat(26), role: 'primary', variantId: 'V1'.padEnd(26, 'x'), asset: { url: '/b.jpg', width: 800, height: 800, status: 'ready' } },
  ],
  attributes: [],
  ...overrides,
});

describe('normalizeProduct', () => {
  it('hides archived variants and keeps money as strings', () => {
    const form = normalizeProduct(dto());
    expect(form.variants).toHaveLength(1);
    expect(form.archivedVariantCount).toBe(1);
    expect(form.variants[0].regularPrice).toBe('1200.00');
    expect(form.variants[0].stockBaseline).toBe('10');
    expect(form.variants[0].lowStockThreshold).toBe('');
    expect(form.variants[0].effectiveThreshold).toBe(5);
  });

  it('puts the primary image first', () => {
    const form = normalizeProduct(dto());
    expect(form.media.map((item) => item.role)).toEqual(['primary', 'gallery']);
    expect(form.media[0].variantKey).toBe('V1'.padEnd(26, 'x'));
  });
});

describe('buildPayload', () => {
  it('only sends stock for existing variants when it was edited', () => {
    const form = normalizeProduct(dto());
    expect(buildPayload(form, { isNew: false }).variants[0]).not.toHaveProperty('initialStock');
    form.variants[0].initialStock = '25';
    expect(buildPayload(form, { isNew: false }).variants[0].initialStock).toBe(25);
  });

  it('sends version, ids and relation ids on update and omits archived variants', () => {
    const payload = buildPayload(normalizeProduct(dto()), { isNew: false });
    expect(payload.version).toBe(4);
    expect(payload.variants).toHaveLength(1);
    expect(payload.variants[0]).toMatchObject({ id: 'V1'.padEnd(26, 'x'), version: 2, regularPrice: '1200.00', lowStockThreshold: null });
    expect(payload.relations).toEqual({ related: [], cross_sell: [] });
    expect(payload.media.map((item) => item.displayOrder)).toEqual([0, 1]);
  });

  it('never sends a cost price without the cost permission', () => {
    const form = normalizeProduct(dto());
    expect(buildPayload(form, { isNew: false, canCost: false }).variants[0].costPrice).toBeNull();
    expect(buildPayload(form, { isNew: false, canCost: true }).variants[0].costPrice).toBe('700.00');
  });

  it('builds a create payload with stock and variantSku for media', () => {
    const form = { ...emptyProduct(), slug: 'tee', translations: { en: { ...emptyProduct().translations.en, name: 'Tee' }, bn: { ...emptyProduct().translations.bn, name: 'টি' } } };
    form.variants = [newVariant({ clientKey: 'k1', sku: ' TEE-1 ', title: 'Default', regularPrice: '500', initialStock: '7', isDefault: true })];
    form.media = [{ key: 'a', mediaId: 'X'.repeat(26), role: 'primary', altEn: '', altBn: '', variantKey: 'k1' }];
    const payload = buildPayload(form, { isNew: true });
    expect(payload.variants[0]).toMatchObject({ sku: 'TEE-1', stock: 7, regularPrice: '500', salePrice: null });
    expect(payload.variants[0]).not.toHaveProperty('id');
    expect(payload.media[0]).toMatchObject({ variantSku: 'TEE-1', altEn: null });
    expect(payload).not.toHaveProperty('version');
  });

  it('promotes a default variant when none is marked', () => {
    const form = emptyProduct();
    form.variants = [newVariant({ sku: 'A', regularPrice: '1' }), newVariant({ sku: 'B', regularPrice: '1' })];
    expect(buildPayload(form, { isNew: true }).variants.map((variant) => variant.isDefault)).toEqual([true, false]);
  });
});

describe('validateProduct', () => {
  const valid = () => {
    const form = emptyProduct();
    form.translations.en.name = 'Shirt';
    form.translations.bn.name = 'শার্ট';
    form.variants = [newVariant({ sku: 'SH-1', regularPrice: '1000', isDefault: true })];
    return form;
  };
  it('accepts a minimal draft', () => expect(validateProduct(valid())).toEqual({}));

  it('rejects a sale price that is not below the regular price (decimal, not float)', () => {
    const form = valid();
    form.variants[0].salePrice = '1000.00';
    expect(validateProduct(form)['variants.0.salePrice']).toMatch(/lower/);
    form.variants[0].salePrice = '999.99';
    expect(validateProduct(form)).toEqual({});
  });

  it('flags duplicate SKUs on both rows, case-insensitively', () => {
    const form = valid();
    form.type = 'variable';
    form.variants.push(newVariant({ sku: 'sh-1', regularPrice: '1000' }));
    const errors = validateProduct(form);
    expect(errors['variants.0.sku']).toBeTruthy();
    expect(errors['variants.1.sku']).toBeTruthy();
  });

  it('requires a category, a primary image and a future time before publishing', () => {
    const form = valid();
    form.status = 'scheduled';
    form.publishAt = '2000-01-01T10:00';
    const errors = validateProduct(form);
    expect(errors.categoryId).toBeTruthy();
    expect(errors.media).toBeTruthy();
    expect(errors.publishAt).toMatch(/future/);
  });

  it('requires a preorder date and valid money', () => {
    const form = valid();
    form.variants[0].stockPolicy = 'preorder';
    form.variants[0].regularPrice = '12.345';
    const errors = validateProduct(form);
    expect(errors['variants.0.preorderAvailableAt']).toBeTruthy();
    expect(errors['variants.0.regularPrice']).toBeTruthy();
  });

  it('keeps a simple product to one variant and allows a blank low stock alert', () => {
    const form = valid();
    form.variants.push(newVariant({ sku: 'X', regularPrice: '1' }));
    expect(validateProduct(form).variants).toMatch(/simple/i);
    form.type = 'variable';
    expect(validateProduct(form)['variants.0.lowStockThreshold']).toBeUndefined();
  });

  it('blocks images that are still processing', () => {
    const form = valid();
    form.media = [{ key: 'a', mediaId: 'X'.repeat(26), role: 'primary', altEn: '', altBn: '', assetStatus: 'processing' }];
    expect(validateProduct(form)['media.0.mediaId']).toBeTruthy();
  });
});

describe('backend error mapping', () => {
  it('flattens fieldErrors to the first message per path', () => {
    expect(mapFieldErrors({ 'variants.1.sku': ['Taken.', 'Other'], media: ['Choose a primary image.'] })).toEqual({ 'variants.1.sku': 'Taken.', media: 'Choose a primary image.' });
    expect(mapFieldErrors(null)).toEqual({});
  });
  it('knows which section a path belongs to and how to name it', () => {
    expect(sectionForPath('variants.3.sku')).toBe('variants');
    expect(sectionForPath('translations.bn.seoTitle')).toBe('content');
    expect(sectionForPath('translations.en.name')).toBe('general');
    expect(sectionForPath('sizeChartIds')).toBe('variants');
    expect(sectionForPath('media')).toBe('media');
    expect(sectionForPath('categoryId')).toBe('general');
    expect(sectionForPath('slug')).toBe('general');
    expect(sectionForPath('publishAt')).toBe('general');
    expect(sectionForPath('variants')).toBe('variants');
    expect(sectionForPath('lowStockThreshold')).toBe('advanced');
    expect(labelForPath('variants.0.regularPrice')).toBe('Variant 1 regular price');
    expect(labelForPath('translations.bn.name')).toBe('Bangla name');
  });
  it('lists publication blockers', () => {
    const form = emptyProduct();
    expect(publishBlockers(form).map((item) => item.path)).toEqual(expect.arrayContaining(['categoryId', 'media', 'variants', 'translations.en.name']));
  });
  it('checks publication readiness like the backend (images, size chart, schedule)', () => {
    const ready = {
      slug: 'kurti', categoryId: 'c1', sizeChartIds: [], attributes: [],
      translations: { en: { name: 'Kurti' }, bn: { name: 'কুর্তি' } },
      variants: [{ status: 'active', regularPrice: '1200', stockPolicy: 'deny' }],
      media: ['primary', 'gallery', 'gallery', 'gallery'].map((role) => ({ role })),
    };
    expect(publishBlockers(ready)).toEqual([]);
    expect(publishBlockers({ ...ready, media: ready.media.slice(0, 3) }, { minImages: 4 }).map((c) => c.id)).toEqual(['image-count']);
    expect(publishBlockers({ ...ready, media: ready.media.slice(0, 3) }, { minImages: 3 })).toEqual([]);
    expect(publishBlockers({ ...ready, media: [...ready.media.slice(0, 3), { role: 'size_chart' }] }).map((c) => c.id)).toEqual(['image-count']);
    const sized = { ...ready, attributes: [{ key: 'size', variation: true }] };
    expect(publishBlockers(sized).map((c) => c.path)).toEqual(['sizeChartIds']);
    expect(publishBlockers({ ...sized, sizeChartIds: ['s1'] })).toEqual([]);
    expect(publishBlockers({ ...ready, attributes: [{ key: 'size', variation: false }] })).toEqual([]);
    expect(publishBlockers({ ...ready, variants: [{ status: 'archived', regularPrice: '10' }] }).map((c) => c.path)).toEqual(['variants']);
    expect(publishBlockers({ ...ready, variants: [{ status: 'active', regularPrice: '0' }] }).map((c) => c.path)).toEqual(['variants']);
    expect(publishBlockers({ ...ready, variants: [{ status: 'active', regularPrice: '5', stockPolicy: 'preorder' }] }).map((c) => c.path)).toEqual(['variants']);
    const now = new Date('2026-01-01T00:00:00Z');
    expect(publishReadiness(ready, { status: 'scheduled', publishAt: '2025-12-31T00:00:00Z', now }).filter((c) => !c.ok).map((c) => c.path)).toEqual(['publishAt']);
    expect(publishReadiness(ready, { status: 'scheduled', publishAt: '2026-02-01T00:00:00Z', now }).every((c) => c.ok)).toBe(true);
  });
});

describe('variant matrix', () => {
  const selections = [{ attribute: sizeAttribute, valueIds: sizeAttribute.values.map((value) => value.id) }, { attribute: colourAttribute, valueIds: [colourAttribute.values[0].id] }];

  it('builds every combination with titles, attributes and SKU parts', () => {
    const rows = buildMatrixRows(selections);
    expect(rows).toHaveLength(3);
    expect(rows[0].title).toBe('S / Jet Black');
    expect(rows[0].attributes).toEqual({ size: 'S', colour: 'Black' });
    expect(rows[0].skuParts).toEqual(['S', 'BLACK']);
  });

  it('adds only missing combinations and keeps edits on existing ones', () => {
    const rows = buildMatrixRows(selections);
    const existing = [newVariant({ sku: 'KEEP-S', title: 'S / Jet Black', regularPrice: '1500', salePrice: '1200', isDefault: true, attributeValueIds: rows[0].attributeValueIds })];
    const diff = diffMatrix(existing, rows);
    expect(diff.added).toHaveLength(2);
    expect(diff.kept).toHaveLength(1);
    const next = applyMatrix(existing, rows, { skuPrefix: 'SH', regularPrice: '1000' });
    expect(next).toHaveLength(3);
    expect(next[0]).toEqual(existing[0]);
    expect(next[0].salePrice).toBe('1200');
    expect(next.map((variant) => variant.sku)).toEqual(['KEEP-S', 'SH-M-BLACK', 'SH-L-BLACK']);
    expect(next.filter((variant) => variant.isDefault)).toHaveLength(1);
  });

  it('is idempotent and reports variants that fell out of the selection', () => {
    const rows = buildMatrixRows(selections);
    const once = applyMatrix([newVariant()], rows, { skuPrefix: 'SH', regularPrice: '10' });
    expect(once).toHaveLength(3);
    expect(applyMatrix(once, rows, { skuPrefix: 'SH' })).toBe(once);
    const fewer = buildMatrixRows([{ attribute: sizeAttribute, valueIds: [sizeAttribute.values[0].id] }]);
    expect(diffMatrix(once, fewer).orphaned.length).toBeGreaterThan(0);
  });

  it('keeps generated SKUs unique against existing ones', () => {
    const rows = buildMatrixRows(selections);
    const taken = [newVariant({ sku: 'sh-m-black', regularPrice: '1' })];
    const next = applyMatrix(taken, rows, { skuPrefix: 'SH', regularPrice: '10' });
    expect(new Set(next.map((variant) => variant.sku.toLowerCase())).size).toBe(next.length);
  });
});

describe('optimistic locking', () => {
  it('summarises what changed on the server', () => {
    const baseline = normalizeProduct(dto());
    const latest = normalizeProduct(dto({ version: 5, slug: 'shirt-new', variants: [{ ...dto().variants[0], version: 3 }] }));
    const changes = describeServerChanges(baseline, latest);
    expect(changes).toEqual(expect.arrayContaining(['URL slug is now "shirt-new"', 'Variant SH-S was edited']));
  });

  it('rebases my edits onto the latest versions and drops variants that disappeared', () => {
    const mine = normalizeProduct(dto());
    mine.translations.en.name = 'My edit';
    mine.variants.push({ ...newVariant({ sku: 'GONE', regularPrice: '1' }), id: 'G'.repeat(26), version: 1 });
    const latest = normalizeProduct(dto({ version: 9, variants: [{ ...dto().variants[0], version: 7, inventory: [{ onHand: 3, reserved: 0, available: 3, lowStockThreshold: 5 }] }] }));
    const { form, dropped } = rebaseOnto(mine, latest);
    expect(form.version).toBe(9);
    expect(form.translations.en.name).toBe('My edit');
    expect(form.variants[0].version).toBe(7);
    expect(form.variants[0].stockBaseline).toBe('3');
    expect(dropped).toEqual(['GONE']);
  });

  it('detects unsaved edits but ignores upload processing state', () => {
    const form = normalizeProduct(dto());
    const before = snapshotOf(form);
    const later = { ...form, media: form.media.map((item) => ({ ...item, assetStatus: 'ready', previewUrl: 'x' })) };
    expect(snapshotOf(later)).toBe(before);
    expect(snapshotOf({ ...form, slug: 'other' })).not.toBe(before);
  });
});

describe('media, money and list helpers', () => {
  it('keeps one primary and moves it first', () => {
    const list = normalizeMedia([{ role: 'gallery', mediaId: 'a' }, { role: 'primary', mediaId: 'b' }, { role: 'primary', mediaId: 'c' }]);
    expect(list.map((item) => `${item.mediaId}:${item.role}`)).toEqual(['b:primary', 'a:gallery', 'c:gallery']);
    expect(normalizeMedia([{ role: 'gallery', mediaId: 'a' }])[0].role).toBe('primary');
    expect(normalizeMedia([{ role: 'size_chart', mediaId: 'a' }])[0].role).toBe('size_chart');
  });

  it('computes margin with decimals, ignoring a sale that is not lower', () => {
    expect(computeMargin('1000', '800.10', '500.05')).toMatchObject({ selling: '800.10', profit: '300.05', margin: '37.5' });
    expect(computeMargin('1000', '1200', '')).toMatchObject({ selling: '1000.00', profit: null });
    expect(computeMargin('abc', '', '')).toBeNull();
    expect(computeMargin('100', '', '150').negative).toBe(true);
  });

  it('turns a picked day into inclusive ISO bounds', () => {
    const start = dayBoundIso('2026-03-05', 'start');
    const end = dayBoundIso('2026-03-05', 'end');
    expect(new Date(end).getTime() - new Date(start).getTime()).toBe(86400000 - 1);
    expect(dayBoundIso('', 'start')).toBeUndefined();
    expect(dayBoundIso('05/03/2026', 'end')).toBeUndefined();
  });

  it('computes the starting price from active variants only', () => {
    expect(startingPrice([{ regularPrice: '500.00', status: 'archived' }, { regularPrice: '900.50', status: 'active' }, { regularPrice: '1200.00', status: 'active' }])).toBe('900.50');
    expect(startingPrice([])).toBeNull();
  });
});
