import { describe, expect, it } from 'vitest';
import en from '@/messages/en.json';
import bn from '@/messages/bn.json';
import { draftCountQuery, firstMissingGroup, selectionSummary, knownQuantity, buildProductJsonLd, catalogQuery, findVariant, formatNumber, hasActiveFilters, initialSelection, isRefinedListing, normalizePriceRange, optionGroups, parseAttr, productBadges, quickAddVariant, selectOption, selectionFromVariant, serializeAttr, sizeSummary, valueState, variantFromParam } from '@/lib/storefront';
import { discountPercent, formatMoney } from '@/lib/utils';

const variant = (id, size, colour, available = true, extra = {}) => ({ id, attributes: { size, colour }, available, stockPolicy: 'deny', availableQuantity: available ? 3 : 0, price: '1500.00', regularPrice: '1500.00', salePrice: null, isDefault: false, ...extra });
const product = {
  attributes: [
    { key: 'size', label: 'Size', type: 'select', values: [{ value: 'S', label: 'S' }, { value: 'M', label: 'M' }, { value: 'L', label: 'L' }] },
    { key: 'colour', label: 'Colour', type: 'color', values: [{ value: 'Red', label: 'Red', colorHex: '#aa0000' }, { value: 'Blue', label: 'Blue', colorHex: '#0000aa' }] }
  ],
  variants: [variant('1', 'S', 'Red'), variant('2', 'M', 'Red', false), variant('3', 'L', 'Red', true, { isDefault: true }), variant('4', 'S', 'Blue')]
};

describe('variant selection', () => {
  const groups = optionGroups(product);

  it('orders colour before size and keeps definition order', () => {
    expect(groups.map((group) => group.type)).toEqual(['color', 'size']);
    expect(groups[1].values.map((value) => value.value)).toEqual(['S', 'M', 'L']);
  });

  it('preselects only an available backend default', () => {
    expect(initialSelection(product, groups)).toEqual({ colour: 'Red', size: 'L' });
    const unavailableDefault = { ...product, variants: product.variants.map((item) => ({ ...item, isDefault: item.id === '2' })) };
    expect(initialSelection(unavailableDefault, groups)).toEqual({});
  });

  it('marks sold-out and impossible combinations', () => {
    expect(valueState(product.variants, { colour: 'Red' }, 'size', 'M')).toBe('soldout');
    expect(valueState(product.variants, { colour: 'Blue' }, 'size', 'L')).toBe('impossible');
    expect(valueState(product.variants, { colour: 'Blue' }, 'size', 'S')).toBe('available');
  });

  it('finds a variant only when every option is chosen', () => {
    expect(findVariant(product.variants, { colour: 'Red' }, groups)).toBeNull();
    expect(findVariant(product.variants, { colour: 'Blue', size: 'S' }, groups)?.id).toBe('4');
  });

  it('summarizes sizes and badges for listing cards', () => {
    expect(sizeSummary(product)).toEqual([{ label: 'S', available: true }, { label: 'M', available: false }, { label: 'L', available: true }]);
    expect(productBadges(product)).toMatchObject({ soldOut: false, onSale: false });
  });
});

describe('formatting', () => {
  it('formats taka in both scripts without trailing paisa', () => {
    expect(formatMoney('1250.00', 'en')).toBe('৳1,250');
    expect(formatMoney('1250.50', 'en')).toBe('৳1,250.50');
    expect(formatMoney('125000.00', 'bn')).toBe('৳১,২৫,০০০');
  });

  it('computes whole discount percentages from decimal strings', () => {
    expect(discountPercent('2000.00', '1500.00')).toBe(25);
    expect(discountPercent('1500.00', '1500.00')).toBe(0);
    expect(discountPercent('0', '10')).toBe(0);
  });

  it('parses attribute filters from the URL', () => {
    expect(parseAttr('size:M|L,colour:Red')).toEqual({ size: ['M', 'L'], colour: ['Red'] });
    expect(parseAttr('')).toEqual({});
  });
});

describe('translations', () => {
  const keys = (object, prefix = '') => Object.entries(object).flatMap(([key, value]) => (value && typeof value === 'object' ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`]));
  it('has identical keys in English and Bangla (FE-I18N-001)', () => {
    expect(keys(bn).sort()).toEqual(keys(en).sort());
  });
  it('has no empty Bangla strings', () => {
    const empty = keys(bn).filter((key) => !key.split('.').reduce((value, part) => value?.[part], bn));
    expect(empty).toEqual([]);
  });
});

describe('option selection', () => {
  const groups = optionGroups(product);
  it('clears a chosen value that cannot combine with the new choice', () => {
    // Blue only exists in S, so picking Blue must drop the L selection.
    expect(selectOption(product.variants, groups, { colour: 'Red', size: 'L' }, 'colour', 'Blue')).toEqual({ colour: 'Blue', size: undefined });
    expect(selectOption(product.variants, groups, { colour: 'Red', size: 'S' }, 'colour', 'Blue')).toEqual({ colour: 'Blue', size: 'S' });
  });
  it('toggles non-colour options off but keeps a colour selected', () => {
    expect(selectOption(product.variants, groups, { colour: 'Red', size: 'S' }, 'size', 'S')).toEqual({ colour: 'Red', size: undefined });
    expect(selectOption(product.variants, groups, { colour: 'Red', size: 'S' }, 'colour', 'Red').colour).toBe('Red');
  });
  it('restores a selection from ?variant= by id or SKU', () => {
    const withSku = { ...product, variants: product.variants.map((item) => ({ ...item, sku: `SKU-${item.id}` })) };
    expect(variantFromParam(withSku, 'SKU-4')?.id).toBe('4');
    expect(variantFromParam(withSku, '2')?.id).toBe('2');
    expect(variantFromParam(withSku, 'nope')).toBeNull();
    expect(selectionFromVariant(withSku.variants[3], groups)).toEqual({ colour: 'Blue', size: 'S' });
  });
  it('allows quick add only for one unambiguous in-stock variant', () => {
    expect(quickAddVariant(product)).toBeNull();
    const single = { variants: [variant('9', undefined, undefined)] };
    expect(quickAddVariant(single)?.id).toBe('9');
    expect(quickAddVariant({ variants: [variant('9', undefined, undefined, false)] })).toBeNull();
    expect(quickAddVariant({ variants: [variant('9', undefined, undefined, true, { stockPolicy: 'preorder' })] })).toBeNull();
  });
});

describe('listing URL state', () => {
  it('keeps only valid filter values', () => {
    expect(catalogQuery({ minPrice: '500', maxPrice: 'abc', available: 'true', sale: 'yes', sort: 'bogus', page: '0', brand: 'x', attr: 'size:M' })).toEqual({ minPrice: '500', available: 'true', brand: 'x', attr: 'size:M' });
    expect(catalogQuery({ sort: ['price_asc', 'newest'], page: '3' })).toEqual({ sort: 'price_asc', page: '3' });
  });
  it('swaps a reversed price range and lets fixed values win', () => {
    expect(catalogQuery({ minPrice: '900', maxPrice: '100' })).toEqual({ minPrice: '100', maxPrice: '900' });
    expect(catalogQuery({ category: 'a' }, { category: 'b' })).toEqual({ category: 'b' });
    expect(normalizePriceRange('50a', '10')).toEqual({ min: '10', max: '50' });
  });
  it('round-trips attribute filters and detects refinements', () => {
    expect(serializeAttr(parseAttr('size:M|L,colour:Red'))).toBe('size:M|L,colour:Red');
    expect(hasActiveFilters({ sort: 'newest' })).toBe(false);
    expect(hasActiveFilters({ sale: 'true' })).toBe(true);
    expect(hasActiveFilters({ category: 'x' }, ['category'])).toBe(false);
    expect(isRefinedListing({})).toBe(false);
    expect(isRefinedListing({ sort: 'newest' })).toBe(true);
    expect(isRefinedListing({ page: '2' })).toBe(true);
  });
});

describe('product JSON-LD', () => {
  const detail = {
    name: 'Jamdani Saree', shortDescription: 'Handloom', brand: { name: 'Elite' }, category: { name: 'Sarees', slug: 'sarees' },
    images: [{ url: 'https://cdn.test/a.jpg' }], rating: { average: 4.5, count: 12 },
    variants: [
      { id: 'v1', sku: 'JS-RED', price: '4500.00', available: true, stockPolicy: 'deny', availableQuantity: 4, isDefault: true },
      { id: 'v2', sku: 'JS-BLUE', price: '3900.00', available: false, stockPolicy: 'deny', availableQuantity: 0 },
      { id: 'v3', sku: 'JS-PRE', price: '4100.00', available: true, stockPolicy: 'preorder', availableQuantity: 0 }
    ]
  };
  const graph = buildProductJsonLd({ product: detail, locale: 'en', origin: 'https://shop.test', slug: 'jamdani', labels: { home: 'Home' } })['@graph'];
  it('emits one offer per variant with the right availability', () => {
    expect(graph[0].offers.map((offer) => [offer.sku, offer.price, offer.availability.split('/').pop()])).toEqual([['JS-RED', '4500.00', 'InStock'], ['JS-BLUE', '3900.00', 'OutOfStock'], ['JS-PRE', '4100.00', 'PreOrder']]);
    expect(graph[0].offers[0].url).toBe('https://shop.test/en/product/jamdani?variant=JS-RED');
    expect(graph[0].sku).toBe('JS-RED');
  });
  it('includes the rating only when there are reviews, and a breadcrumb trail', () => {
    expect(graph[0].aggregateRating).toMatchObject({ ratingValue: '4.5', reviewCount: 12 });
    expect(buildProductJsonLd({ product: { ...detail, rating: { average: 0, count: 0 } }, locale: 'en', origin: 'https://shop.test', slug: 'jamdani' })['@graph'][0].aggregateRating).toBeUndefined();
    expect(graph[1].itemListElement.map((item) => item.name)).toEqual(['Home', 'Sarees', 'Jamdani Saree']);
  });
});

describe('number formatting', () => {
  it('uses Bangla digits under bn', () => {
    expect(formatNumber(4.5, 'bn', 1)).toBe('৪.৫');
    expect(formatNumber(12, 'en')).toBe('12');
  });
});

describe('hidden exact stock', () => {
  it('treats a null quantity as unknown, never as zero', () => {
    expect(knownQuantity({ availableQuantity: null })).toBeNull();
    expect(knownQuantity({ availableQuantity: 3 })).toBe(3);
    expect(quickAddVariant({ variants: [variant('9', undefined, undefined, true, { availableQuantity: null })] })?.id).toBe('9');
  });
  it('accepts the new sorts and the new filter from the URL', () => {
    expect(catalogQuery({ sort: 'bestselling', new: 'true' })).toEqual({ sort: 'bestselling', new: 'true' });
    expect(catalogQuery({ sort: 'top_rated' })).toEqual({ sort: 'top_rated' });
  });
  it('builds the breadcrumb trail from API breadcrumbs', () => {
    const ld = buildProductJsonLd({ product: { name: 'P', variants: [], breadcrumbs: [{ slug: 'a', name: 'A' }, { slug: 'b', name: 'B' }] }, locale: 'en', origin: 'https://x.test', slug: 'p' });
    expect(ld['@graph'][1].itemListElement.map((item) => item.name)).toEqual(['Home', 'A', 'B', 'P']);
  });
});

describe('buy bar and filter preview helpers', () => {
  const groups = optionGroups(product);

  it('summarises chosen options and finds the first missing group', () => {
    expect(selectionSummary(groups, { colour: 'Red' })).toEqual([{ key: 'colour', type: 'color', label: 'Red' }]);
    expect(selectionSummary(groups, {})).toEqual([]);
    expect(firstMissingGroup(groups, { colour: 'Red' })?.key).toBe('size');
    expect(firstMissingGroup(groups, { colour: 'Red', size: 'M' })).toBeNull();
  });

  it('builds the preview count query from a filter draft, with fixed values winning', () => {
    const draft = { attr: { size: ['M', 'L'] }, category: 'saree', brand: '', minPrice: '900', maxPrice: '100', available: true, sale: false, isNew: true };
    expect(draftCountQuery(draft, { q: 'red' })).toEqual({ attr: 'size:M|L', category: 'saree', minPrice: '100', maxPrice: '900', available: 'true', new: 'true', q: 'red' });
    expect(draftCountQuery(draft, { category: 'kurti' }).category).toBe('kurti');
    expect(draftCountQuery({ attr: {} })).toEqual({});
  });
});
