/**
 * Storefront helpers shared by server and client components. Variant logic
 * only drives selection UX; price and stock always come from the backend DTO.
 */

export function localizedHref(url, locale) {
  if (!url) return `/${locale}`;
  if (/^https:\/\//.test(url)) return url;
  if (/^\/(en|bn)(\/|$)/.test(url)) return url;
  return `/${locale}${url.startsWith('/') ? url : `/${url}`}`;
}

export function localizedText(value, locale) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[locale] || value.en || value.bn || '';
}

const isPlainObject = (value) => value != null && typeof value === 'object' && !Array.isArray(value);

const sizePattern = /size|সাইজ/i;
const colorPattern = /colou?r|রং/i;

/** Option groups (size, colour, …) used by the product's variants. */
export function optionGroups(product) {
  const variants = product?.variants || [];
  const used = new Map();
  for (const variant of variants)
    for (const [key, value] of Object.entries(isPlainObject(variant.attributes) ? variant.attributes : {})) {
      if (value == null || value === '') continue;
      if (!used.has(key)) used.set(key, new Set());
      used.get(key).add(String(value));
    }
  const definitions = new Map((product?.attributes || []).map((attribute) => [attribute.key, attribute]));
  const groups = [...used.entries()].map(([key, values]) => {
    const definition = definitions.get(key);
    const known = (definition?.values || []).filter((item) => values.has(String(item.value)));
    const ordered = known.length
      ? known.map((item) => ({ value: String(item.value), label: item.label || item.value, colorHex: item.colorHex || null }))
      : [...values].map((value) => ({ value, label: value, colorHex: null }));
    // Values present on variants but missing from the definition still need a button.
    for (const value of values) if (!ordered.some((item) => item.value === value)) ordered.push({ value, label: value, colorHex: null });
    const label = definition?.label || key.replace(/[-_]/g, ' ');
    const isColor = definition?.type === 'color' || colorPattern.test(key) || colorPattern.test(label);
    const isSize = !isColor && (sizePattern.test(key) || sizePattern.test(label));
    return { key, label, type: isColor ? 'color' : isSize ? 'size' : 'select', values: ordered };
  });
  // Colour first, then size, then anything else (matches common fashion PDPs).
  const rank = { color: 0, size: 1, select: 2 };
  return groups.sort((left, right) => rank[left.type] - rank[right.type]);
}

function matches(variant, selection, ignoreKey = null) {
  return Object.entries(selection).every(([key, value]) => key === ignoreKey || value == null || String(variant.attributes?.[key]) === String(value));
}

export function findVariant(variants, selection, groups) {
  if (!groups.length) return variants.find((variant) => variant.isDefault) || variants[0] || null;
  if (groups.some((group) => selection[group.key] == null)) return null;
  return variants.find((variant) => matches(variant, selection)) || null;
}

/** Whether choosing `value` for `key` can still lead to a purchasable variant. */
export function valueState(variants, selection, key, value) {
  const candidates = variants.filter((variant) => String(variant.attributes?.[key]) === String(value) && matches(variant, selection, key));
  if (!candidates.length) return 'impossible';
  return candidates.some((variant) => variant.available) ? 'available' : 'soldout';
}

/** Preselects only the backend default variant, and only when it can be bought. */
export function initialSelection(product, groups) {
  const fallback = Object.fromEntries(groups.filter((group) => group.values.length === 1).map((group) => [group.key, group.values[0].value]));
  const preferred = (product?.variants || []).find((variant) => variant.isDefault && variant.available);
  if (!preferred) return fallback;
  return { ...fallback, ...Object.fromEntries(groups.map((group) => [group.key, preferred.attributes?.[group.key] != null ? String(preferred.attributes[group.key]) : undefined])) };
}

/** Exact stock, or null when the store hides it (callers must then not cap quantity). */
export function knownQuantity(variant) {
  const value = variant?.availableQuantity;
  return value == null || !Number.isFinite(Number(value)) ? null : Number(value);
}

export function defaultVariant(product) {
  const variants = product?.variants || [];
  return variants.find((variant) => variant.isDefault) || variants[0] || null;
}

/** Sizes offered by a product (for listing cards), with availability. */
export function sizeSummary(product) {
  const group = optionGroups(product).find((item) => item.type === 'size');
  if (!group) return [];
  return group.values.map((value) => ({
    label: value.label,
    available: (product.variants || []).some((variant) => String(variant.attributes?.[group.key]) === value.value && variant.available)
  }));
}

export function productBadges(product) {
  const variants = product?.variants || [];
  const preferred = defaultVariant(product);
  const anyAvailable = variants.some((variant) => variant.available);
  return {
    soldOut: variants.length > 0 && !anyAvailable,
    preorder: variants.some((variant) => variant.available && variant.stockPolicy === 'preorder'),
    lowStock: Boolean(preferred?.lowStock && preferred?.available && preferred?.stockPolicy === 'deny'),
    onSale: Boolean(preferred?.salePrice)
  };
}

/** Image to show on hover/swipe: the first gallery image that is not the primary one. */
export function secondaryImage(product) {
  const primary = product?.primaryImage;
  return (product?.images || []).find((image) => image.url && image.url !== primary?.url && !image.variantId) || null;
}

export const cmToInch = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round((number / 2.54) * 10) / 10 : value;
};
export const inchToCm = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 2.54 * 10) / 10 : value;
};

/** Locale-aware number for ratings and counts (Bangla digits under `bn`). */
export function formatNumber(value, locale = 'en', fractionDigits = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-US', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(number);
}

/**
 * Applies one option click to the selection. Clicking the chosen value again
 * clears it (except colour, which always keeps one), and other groups whose
 * chosen value can no longer combine with the new choice are cleared so the
 * shopper is never left on an impossible combination.
 */
export function selectOption(variants, groups, selection, key, value) {
  const group = groups.find((item) => item.key === key);
  const toggleOff = selection[key] === value && groups.length > 1 && group?.type !== 'color';
  const next = { ...selection, [key]: toggleOff ? undefined : value };
  if (toggleOff) return next;
  for (const other of groups) {
    if (other.key === key || next[other.key] == null) continue;
    const { [other.key]: current, ...rest } = next;
    if (!variants.some((variant) => String(variant.attributes?.[other.key]) === String(current) && matches(variant, { ...rest, [other.key]: undefined }))) next[other.key] = undefined;
  }
  return next;
}

/** Chosen option labels in group order, e.g. [{ key: 'size', type: 'size', label: 'M' }], for compact summaries. */
export function selectionSummary(groups, selection) {
  return groups
    .filter((group) => selection[group.key] != null)
    .map((group) => ({ key: group.key, type: group.type, label: group.values.find((value) => value.value === selection[group.key])?.label ?? String(selection[group.key]) }));
}

/** First option group still needing a choice, or null when the selection is complete. */
export function firstMissingGroup(groups, selection) {
  return groups.find((group) => selection[group.key] == null) || null;
}

/** `?variant=` accepts a variant id or SKU; unknown values are ignored. */
export function variantFromParam(product, param) {
  const value = Array.isArray(param) ? param[0] : param;
  if (!value) return null;
  return (product?.variants || []).find((variant) => variant.id === value || variant.sku === value) || null;
}

export function selectionFromVariant(variant, groups) {
  return Object.fromEntries(groups.map((group) => [group.key, variant?.attributes?.[group.key] != null ? String(variant.attributes[group.key]) : undefined]));
}

/** The single variant a listing card may add straight to the bag, or null when options need choosing. */
export function quickAddVariant(product) {
  const variants = product?.variants || [];
  if (variants.length !== 1) return null;
  const [variant] = variants;
  if (!variant.available || variant.stockPolicy === 'preorder') return null;
  if (variant.stockPolicy === 'deny' && knownQuantity(variant) === 0) return null;
  return variant;
}

const SORT_VALUES = new Set(['newest', 'price_asc', 'price_desc', 'rating', 'top_rated', 'bestselling', 'relevance']);
const FILTER_KEYS = ['category', 'collection', 'brand', 'attr', 'new', 'occasion', 'fabric', 'minPrice', 'maxPrice', 'available', 'sale', 'sort', 'page'];

/** `attr=size:M|L,color:Red` <-> { size: ['M','L'], color: ['Red'] } */
export function parseAttr(raw) {
  const result = {};
  for (const part of String(raw || '').split(',')) {
    const [key, list] = part.split(':');
    if (key && list) result[key] = list.split('|').filter(Boolean);
  }
  return result;
}

export function serializeAttr(map) {
  return Object.entries(map).filter(([, values]) => values.length).map(([key, values]) => `${key}:${values.join('|')}`).join(',');
}

/** Swaps a reversed price range so min <= max; non-numeric parts are dropped. */
export function normalizePriceRange(min, max) {
  let low = String(min ?? '').replace(/\D/g, '').slice(0, 7);
  let high = String(max ?? '').replace(/\D/g, '').slice(0, 7);
  if (low && high && Number(low) > Number(high)) [low, high] = [high, low];
  return { min: low, max: high };
}

/** Normalizes URL search params into the backend product-list query; the URL is the source of truth. */
export function catalogQuery(searchParams, fixed = {}) {
  const query = {};
  for (const key of FILTER_KEYS) {
    const raw = searchParams?.[key];
    const value = String((Array.isArray(raw) ? raw[0] : raw) ?? '').slice(0, 300);
    if (!value) continue;
    if (key === 'minPrice' || key === 'maxPrice') { if (/^\d{1,7}$/.test(value)) query[key] = value; continue; }
    if (key === 'available' || key === 'sale' || key === 'new') { if (value === 'true') query[key] = 'true'; continue; }
    if (key === 'sort') { if (SORT_VALUES.has(value) && value !== 'relevance') query[key] = value; continue; }
    if (key === 'page') { if (/^[1-9]\d{0,3}$/.test(value)) query[key] = value; continue; }
    query[key] = value;
  }
  if (query.minPrice && query.maxPrice && Number(query.minPrice) > Number(query.maxPrice)) [query.minPrice, query.maxPrice] = [query.maxPrice, query.minPrice];
  return { ...query, ...fixed };
}

/** Active filter keys (excluding sort/page) so empty states can offer "clear filters". */
export function hasActiveFilters(searchParams, ignore = []) {
  return ['category', 'collection', 'brand', 'attr', 'new', 'occasion', 'fabric', 'minPrice', 'maxPrice', 'available', 'sale'].some((key) => !ignore.includes(key) && Boolean(catalogQuery(searchParams)[key]));
}

/**
 * Backend list query for a filter-sheet draft (used to preview the result
 * count). `fixed` (category page, search term, ...) always wins over the draft.
 */
export function draftCountQuery(draft, fixed = {}) {
  const query = {};
  const attr = serializeAttr(draft.attr || {});
  if (attr) query.attr = attr;
  if (draft.category) query.category = draft.category;
  if (draft.brand) query.brand = draft.brand;
  const range = normalizePriceRange(draft.minPrice, draft.maxPrice);
  if (range.min) query.minPrice = range.min;
  if (range.max) query.maxPrice = range.max;
  if (draft.available) query.available = 'true';
  if (draft.sale) query.sale = 'true';
  if (draft.isNew) query.new = 'true';
  return { ...query, ...fixed };
}

const schemaAvailability = (variant) => {
  if (!variant.available) return 'https://schema.org/OutOfStock';
  if (variant.stockPolicy === 'preorder') return 'https://schema.org/PreOrder';
  if (variant.stockPolicy === 'allow_backorder' && knownQuantity(variant) === 0) return 'https://schema.org/BackOrder';
  return 'https://schema.org/InStock';
};

/**
 * Product + BreadcrumbList JSON-LD. One Offer per variant so price and
 * availability always match what the backend returned; undefined fields are
 * dropped on serialization.
 */
export function buildProductJsonLd({ product, locale, origin, slug, labels = {} }) {
  const url = `${origin}/${locale}/product/${slug}`;
  const variants = product.variants || [];
  const images = (product.images || []).map((image) => image.url).filter(Boolean).slice(0, 8);
  const offers = variants.map((variant) => ({
    '@type': 'Offer',
    url: variants.length > 1 ? `${url}?variant=${encodeURIComponent(variant.sku || variant.id)}` : url,
    priceCurrency: 'BDT',
    price: variant.price,
    sku: variant.sku || undefined,
    availability: schemaAvailability(variant),
    itemCondition: 'https://schema.org/NewCondition'
  }));
  const main = {
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription || product.description || undefined,
    image: images.length ? images : undefined,
    sku: defaultVariant(product)?.sku || undefined,
    url,
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    category: product.category?.name || undefined,
    material: product.materialText || undefined,
    inLanguage: locale,
    offers: offers.length ? offers : undefined,
    aggregateRating: product.rating?.count ? { '@type': 'AggregateRating', ratingValue: Number(product.rating.average).toFixed(1), reviewCount: product.rating.count, bestRating: 5, worstRating: 1 } : undefined
  };
  const trail = Array.isArray(product.breadcrumbs) && product.breadcrumbs.length ? product.breadcrumbs : product.category ? [product.category] : [];
  const crumbs = [
    { name: labels.home || 'Home', item: `${origin}/${locale}` },
    ...trail.map((crumb) => ({ name: crumb.name, item: `${origin}/${locale}/category/${crumb.slug}` })),
    { name: product.name, item: url }
  ];
  return {
    '@context': 'https://schema.org',
    '@graph': [main, { '@type': 'BreadcrumbList', itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, ...crumb })) }]
  };
}

/** Sorted, paged or filtered listing URLs duplicate the canonical page, so they are kept out of the index. */
export function isRefinedListing(searchParams) {
  const query = catalogQuery(searchParams);
  return Boolean(query.sort || query.page || hasActiveFilters(searchParams));
}
