import Decimal from 'decimal.js';

/**
 * Pure product-editor logic: form <-> API mapping, validation, backend fieldError mapping,
 * variant-matrix diffing and optimistic-lock rebasing. No React in here so it can be unit tested.
 */

export const MONEY_RE = /^\d{1,10}(\.\d{1,2})?$/;
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_VARIANTS = 250;
export const MAX_MEDIA = 100;
export const MAX_RELATED = 12;
export const IMAGE_RATIO = 3 / 4;

export const STOCK_POLICIES = [
  { value: 'deny', label: 'Stop selling at zero' },
  { value: 'allow_backorder', label: 'Allow backorder' },
  { value: 'preorder', label: 'Preorder' },
  { value: 'available', label: 'Always available (no stock tracking)' },
];

let keyCounter = 0;
export const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `k${Date.now().toString(36)}${(keyCounter += 1)}`);

export const slugify = (text) => String(text || '').toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

const pad = (part) => String(part).padStart(2, '0');
/** datetime-local inputs need local `YYYY-MM-DDTHH:mm`; the API sends and expects ISO-8601 UTC. */
export function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function toIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const blank = (value) => (value === '' || value === undefined ? null : value);
const trimOrNull = (value) => { const text = typeof value === 'string' ? value.trim() : value; return text === '' || text === undefined ? null : text; };

export const emptyTranslation = () => ({ name: '', shortDescription: '', description: '', careText: '', materialText: '', seoTitle: '', seoDescription: '' });

export function newVariant(overrides = {}) {
  return {
    clientKey: uid(),
    sku: '',
    barcode: '',
    title: 'Default',
    attributes: {},
    attributeValueIds: [],
    regularPrice: '',
    salePrice: '',
    costPrice: '',
    saleStartsAt: '',
    saleEndsAt: '',
    stockPolicy: 'deny',
    preorderAvailableAt: '',
    preorderMessage: '',
    weightGrams: '',
    dimensions: { lengthCm: '', widthCm: '', heightCm: '' },
    status: 'active',
    isDefault: false,
    initialStock: '0',
    // Blank inherits the product, then the store, default.
    lowStockThreshold: '',
    ...overrides,
  };
}

export function emptyProduct() {
  return {
    slug: '',
    categoryId: '',
    categoryIds: [],
    collectionIds: [],
    brandId: '',
    type: 'simple',
    status: 'draft',
    publishAt: '',
    featured: false,
    visibility: 'catalog_search',
    taxClass: 'standard',
    shippingProfile: { requiresShipping: true, freeShipping: false, shippingClass: '' },
    fashion: null,
    translations: { en: emptyTranslation(), bn: emptyTranslation() },
    attributes: [],
    variants: [newVariant({ isDefault: true })],
    media: [],
    relations: { related: [], cross_sell: [] },
    lowStockThreshold: '',
    sizeChartIds: [],
    sizeCharts: [],
    version: 1,
  };
}

const text = (value) => (value == null ? '' : String(value));

/** Turns an admin product DTO into editor state. Archived variants are not editable and are left out of the form. */
export function normalizeProduct(product) {
  const base = emptyProduct();
  const sp = product.shippingProfile && typeof product.shippingProfile === 'object' ? product.shippingProfile : {};
  const activeVariants = (product.variants || []).filter((variant) => variant.status !== 'archived' && !variant.archivedAt);
  const variants = activeVariants.map((variant) => {
    const level = variant.inventory?.[0];
    const dims = variant.dimensions || {};
    return {
      ...newVariant(),
      id: variant.id,
      version: variant.version,
      clientKey: variant.id,
      sku: text(variant.sku),
      barcode: text(variant.barcode),
      title: text(variant.title),
      attributes: Object.fromEntries(Object.entries(variant.attributes || {}).filter(([k, v]) => typeof k === 'string' && typeof v === 'string')),
      attributeValueIds: variant.attributeValueIds || [],
      regularPrice: text(variant.regularPrice),
      salePrice: text(variant.salePrice),
      costPrice: text(variant.costPrice),
      saleStartsAt: toLocalInput(variant.saleStartsAt),
      saleEndsAt: toLocalInput(variant.saleEndsAt),
      stockPolicy: variant.stockPolicy || 'deny',
      preorderAvailableAt: toLocalInput(variant.preorderAvailableAt),
      preorderMessage: text(variant.preorderMessage),
      weightGrams: text(variant.weightGrams),
      dimensions: { lengthCm: text(dims.lengthCm), widthCm: text(dims.widthCm), heightCm: text(dims.heightCm) },
      status: 'active',
      isDefault: Boolean(variant.isDefault),
      initialStock: text(level?.onHand ?? 0),
      // Loaded on-hand value; stock is only sent when the user actually changes it (see buildPayload).
      stockBaseline: text(level?.onHand ?? 0),
      reserved: level ? Number(level.reserved) : null,
      lowStockThreshold: text(variant.lowStockThreshold),
      effectiveThreshold: level ? Number(level.lowStockThreshold) : null,
    };
  });
  const keys = new Set(variants.map((variant) => variant.clientKey));
  return {
    ...base,
    id: product.id,
    slug: text(product.slug),
    categoryId: product.categoryId || '',
    categoryIds: product.categoryIds || [],
    collectionIds: product.collectionIds || [],
    brandId: product.brandId || '',
    type: product.type || 'simple',
    status: product.status || 'draft',
    publishAt: toLocalInput(product.publishAt),
    featured: Boolean(product.featured),
    visibility: product.visibility || 'catalog_search',
    taxClass: product.taxClass || 'standard',
    shippingProfile: { requiresShipping: sp.requiresShipping ?? true, freeShipping: sp.freeShipping ?? false, shippingClass: typeof sp.shippingClass === 'string' ? sp.shippingClass : '' },
    fashion: product.fashion || null,
    translations: {
      en: { ...emptyTranslation(), ...Object.fromEntries(Object.entries(product.translations?.en || {}).map(([k, v]) => [k, text(v)])) },
      bn: { ...emptyTranslation(), ...Object.fromEntries(Object.entries(product.translations?.bn || {}).map(([k, v]) => [k, text(v)])) },
    },
    attributes: (product.attributes || []).map((item) => ({ attributeId: item.id, key: item.key, label: item.translations?.en?.label || item.key, variation: Boolean(item.variation), visible: item.visible !== false })),
    variants: variants.length ? variants : base.variants,
    media: normalizeMedia((product.media || []).map((item) => ({
      key: item.id || uid(),
      mediaId: item.mediaId,
      role: item.role,
      altEn: text(item.altEn),
      altBn: text(item.altBn),
      variantKey: item.variantId && keys.has(item.variantId) ? item.variantId : null,
      previewUrl: item.asset?.url || null,
      width: item.asset?.width ?? null,
      height: item.asset?.height ?? null,
      assetStatus: item.asset?.status || 'ready',
    }))),
    relations: { related: product.relations?.related || [], cross_sell: product.relations?.cross_sell || [] },
    lowStockThreshold: text(product.lowStockThreshold),
    sizeChartIds: product.sizeChartIds || [],
    sizeCharts: product.sizeCharts || [],
    archivedVariantCount: (product.variants || []).length - activeVariants.length,
    version: Number(product.version) || 1,
  };
}

/** Keeps exactly one primary image (the first primary, else the first gallery image) and puts it first. */
export function normalizeMedia(list) {
  let primaryIndex = list.findIndex((item) => item.role === 'primary');
  if (primaryIndex < 0) primaryIndex = list.findIndex((item) => item.role === 'gallery');
  const next = list.map((item, index) => {
    if (index === primaryIndex) return item.role === 'primary' ? item : { ...item, role: 'primary' };
    return item.role === 'primary' ? { ...item, role: 'gallery' } : item;
  });
  if (primaryIndex > 0) next.unshift(next.splice(primaryIndex, 1)[0]);
  return next;
}

export function moveItem(list, from, to) {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

/** Warns when a stored image is not close to the 3:4 portrait ratio the storefront crops to. */
export function ratioWarning(item) {
  if (!item.width || !item.height) return null;
  const ratio = item.width / item.height;
  return Math.abs(ratio - IMAGE_RATIO) > 0.06 ? `${item.width}×${item.height}px is not 3:4. It will be cropped on the storefront.` : null;
}

function cleanFashion(fashion) {
  if (!fashion) return null;
  const cleaned = Object.fromEntries(Object.entries(fashion).filter(([, value]) => value != null && value !== '' && !(typeof value === 'object' && !value.en && !value.bn)));
  return Object.keys(cleaned).length ? cleaned : null;
}

const num = (value) => (value === '' || value == null ? null : Number(value));

const thresholdOrNull = (value) => (String(value ?? '').trim() === '' ? null : Number(value));

function variantPayload(variant, { isNew, canCost }) {
  const dims = variant.dimensions || {};
  const dimensions = [dims.lengthCm, dims.widthCm, dims.heightCm].every((value) => value === '' || value == null)
    ? null
    : { lengthCm: num(dims.lengthCm), widthCm: num(dims.widthCm), heightCm: num(dims.heightCm) };
  const tracked = variant.stockPolicy !== 'available';
  const body = {
    sku: variant.sku.trim(),
    barcode: trimOrNull(variant.barcode),
    title: variant.title.trim(),
    attributes: variant.attributes || {},
    attributeValueIds: variant.attributeValueIds || [],
    regularPrice: variant.regularPrice.trim(),
    salePrice: trimOrNull(variant.salePrice),
    // Without catalog.cost the backend keeps the stored cost; never send one.
    costPrice: canCost ? trimOrNull(variant.costPrice) : null,
    saleStartsAt: toIso(variant.saleStartsAt),
    saleEndsAt: toIso(variant.saleEndsAt),
    stockPolicy: variant.stockPolicy,
    preorderAvailableAt: variant.stockPolicy === 'preorder' ? toIso(variant.preorderAvailableAt) : null,
    preorderMessage: variant.stockPolicy === 'preorder' ? trimOrNull(variant.preorderMessage) : null,
    weightGrams: num(variant.weightGrams),
    dimensions,
    status: 'active',
    isDefault: Boolean(variant.isDefault),
    lowStockThreshold: thresholdOrNull(variant.lowStockThreshold),
  };
  if (isNew) return { ...body, stock: tracked ? Number(variant.initialStock || 0) : 0 };
  const out = { ...body, clientKey: variant.clientKey };
  if (variant.id) {
    out.id = variant.id;
    out.version = variant.version;
  }
  // Sending initialStock for an existing variant sets on-hand to that absolute value, so only send it for new
  // variants or when the user edited it; otherwise saving unrelated fields would overwrite newer stock movements.
  if (tracked && (!variant.id || Number(variant.initialStock || 0) !== Number(variant.stockBaseline || 0))) out.initialStock = Number(variant.initialStock || 0);
  return out;
}

/** Exactly one active variant must be the default; promote the first if the user removed it. */
export function ensureDefaultVariant(variants) {
  const active = variants.filter((variant) => variant.status !== 'archived');
  if (!active.length) return variants;
  const first = active.find((variant) => variant.isDefault) || active[0];
  return variants.map((variant) => ({ ...variant, isDefault: variant === first }));
}

export function buildPayload(form, { isNew, canCost = true }) {
  const variants = ensureDefaultVariant(form.variants);
  const keyToSku = new Map(variants.map((variant) => [variant.clientKey, variant.sku.trim()]));
  const media = normalizeMedia(form.media).map((item, index) => {
    const base = { mediaId: item.mediaId, role: item.role, displayOrder: index, altEn: trimOrNull(item.altEn), altBn: trimOrNull(item.altBn) };
    if (isNew) return { ...base, variantSku: item.variantKey ? keyToSku.get(item.variantKey) || null : null };
    return { ...base, variantKey: item.variantKey && keyToSku.has(item.variantKey) ? item.variantKey : null };
  });
  const translationPayload = (translation) => Object.fromEntries(Object.entries(translation).map(([key, value]) => [key, ['careText', 'materialText', 'seoTitle', 'seoDescription'].includes(key) ? trimOrNull(value) : (value || '')]));
  const sp = form.shippingProfile || {};
  const payload = {
    slug: form.slug.trim() || slugify(form.translations.en.name),
    categoryId: blank(form.categoryId),
    categoryIds: form.categoryIds.filter((id) => id !== form.categoryId),
    collectionIds: form.collectionIds,
    brandId: blank(form.brandId),
    type: form.type,
    status: form.status,
    publishAt: form.status === 'scheduled' ? toIso(form.publishAt) : null,
    featured: form.featured,
    visibility: form.visibility,
    taxClass: form.taxClass.trim() || 'standard',
    shippingProfile: { requiresShipping: Boolean(sp.requiresShipping), freeShipping: Boolean(sp.freeShipping), shippingClass: trimOrNull(sp.shippingClass) },
    fashion: cleanFashion(form.fashion),
    translations: { en: translationPayload(form.translations.en), bn: translationPayload(form.translations.bn) },
    attributes: form.attributes.map((item, index) => ({ attributeId: item.attributeId, variation: Boolean(item.variation), visible: item.visible !== false, displayOrder: index })),
    variants: variants.map((variant) => variantPayload(variant, { isNew, canCost })),
    lowStockThreshold: thresholdOrNull(form.lowStockThreshold),
    media,
  };
  if (isNew) return { ...payload, ...(form.sizeChartIds?.length ? { sizeChartIds: form.sizeChartIds } : {}) };
  return {
    ...payload,
    sizeChartIds: form.sizeChartIds || [],
    version: Number(form.version),
    relations: { related: form.relations.related.map((item) => item.id), cross_sell: form.relations.cross_sell.map((item) => item.id) },
  };
}

const isMoney = (value) => MONEY_RE.test(String(value ?? '').trim());
const isWhole = (value) => /^\d+$/.test(String(value ?? '').trim());

/** Client-side validation mirroring the backend zod schema. Keys are backend field paths. */
export function validateProduct(form) {
  const errors = {};
  const set = (path, message) => { if (!errors[path]) errors[path] = message; };
  const published = form.status === 'published' || form.status === 'scheduled';
  for (const locale of ['en', 'bn']) {
    const t = form.translations[locale];
    const label = locale === 'en' ? 'English' : 'Bangla';
    if (!t.name.trim()) set(`translations.${locale}.name`, `Enter the ${label} product name.`);
    else if (t.name.length > 220) set(`translations.${locale}.name`, 'Use at most 220 characters.');
    if (t.shortDescription.length > 2000) set(`translations.${locale}.shortDescription`, 'Use at most 2,000 characters.');
    if (t.seoTitle.length > 255) set(`translations.${locale}.seoTitle`, 'Use at most 255 characters.');
    if (t.seoDescription.length > 500) set(`translations.${locale}.seoDescription`, 'Use at most 500 characters.');
  }
  const slug = form.slug.trim() || slugify(form.translations.en.name);
  if (!slug) set('slug', 'Enter a slug, or an English name to generate one from.');
  else if (!SLUG_RE.test(slug) || slug.length > 180) set('slug', 'Use lowercase letters, numbers and single hyphens only (max 180).');
  if (published && !form.categoryId) set('categoryId', 'Choose a primary category before publishing.');
  if (form.status === 'scheduled') {
    if (!form.publishAt) set('publishAt', 'Choose when this product goes live.');
    else if (new Date(form.publishAt).getTime() <= Date.now()) set('publishAt', 'Choose a future time.');
  }

  const variants = form.variants.filter((variant) => variant.status !== 'archived');
  if (!variants.length) set('variants', 'Keep at least one variant.');
  if (form.type === 'simple' && variants.length > 1) set('variants', 'A simple product has one variant. Switch the type to Variable, or remove the extra variants.');
  const seen = new Map();
  variants.forEach((variant, index) => {
    const at = (field) => `variants.${index}.${field}`;
    if (!variant.sku.trim()) set(at('sku'), 'Enter a SKU.');
    else if (variant.sku.trim().length > 100) set(at('sku'), 'Use at most 100 characters.');
    else {
      const lower = variant.sku.trim().toLowerCase();
      if (seen.has(lower)) { set(at('sku'), 'This SKU is used by another variant.'); set(`variants.${seen.get(lower)}.sku`, 'This SKU is used by another variant.'); } else seen.set(lower, index);
    }
    if (!variant.title.trim()) set(at('title'), 'Enter a variant title.');
    if (!isMoney(variant.regularPrice)) set(at('regularPrice'), 'Enter a price like 1250 or 1250.50.');
    if (variant.salePrice.trim()) {
      if (!isMoney(variant.salePrice)) set(at('salePrice'), 'Enter a price like 999 or 999.50.');
      else if (isMoney(variant.regularPrice) && new Decimal(variant.salePrice).greaterThanOrEqualTo(variant.regularPrice)) set(at('salePrice'), 'Sale price must be lower than the regular price.');
    }
    if (variant.costPrice.trim() && !isMoney(variant.costPrice)) set(at('costPrice'), 'Enter a cost like 600 or 600.50.');
    if (variant.saleStartsAt && variant.saleEndsAt && new Date(variant.saleStartsAt) >= new Date(variant.saleEndsAt)) set(at('saleEndsAt'), 'Sale end must be after sale start.');
    if ((variant.saleStartsAt || variant.saleEndsAt) && !variant.salePrice.trim()) set(at('salePrice'), 'Enter a sale price for the scheduled sale.');
    if (variant.stockPolicy === 'preorder' && !variant.preorderAvailableAt) set(at('preorderAvailableAt'), 'Enter when preorders ship.');
    if (variant.stockPolicy !== 'available' && (!isWhole(variant.initialStock) || Number(variant.initialStock) > 1_000_000)) set(at('initialStock'), 'Enter a whole number from 0 to 1,000,000.');
    if (String(variant.lowStockThreshold).trim() !== '' && (!isWhole(variant.lowStockThreshold) || Number(variant.lowStockThreshold) > 1_000_000)) set(at('lowStockThreshold'), 'Enter a whole number, or leave blank to use the default.');
    if (variant.weightGrams !== '' && !isWhole(variant.weightGrams)) set(at('weightGrams'), 'Enter whole grams.');
    for (const key of ['lengthCm', 'widthCm', 'heightCm']) {
      const value = variant.dimensions?.[key];
      if (value !== '' && value != null && !(Number(value) > 0)) set(at(`dimensions.${key}`), 'Enter a positive number.');
    }
  });

  if (form.media.length > MAX_MEDIA) set('media', `Attach at most ${MAX_MEDIA} images.`);
  form.media.forEach((item, index) => {
    if (item.assetStatus && item.assetStatus !== 'ready') set(`media.${index}.mediaId`, 'This image is still processing or failed. Wait for it to finish, or remove it.');
    if ((item.altEn || '').length > 500) set(`media.${index}.altEn`, 'Use at most 500 characters.');
    if ((item.altBn || '').length > 500) set(`media.${index}.altBn`, 'Use at most 500 characters.');
  });
  if (published && !form.media.some((item) => item.role === 'primary')) set('media', 'Choose a primary image before publishing.');

  if (String(form.lowStockThreshold).trim() !== '' && (!isWhole(form.lowStockThreshold) || Number(form.lowStockThreshold) > 1_000_000)) set('lowStockThreshold', 'Enter a whole number, or leave blank to use the store default.');
  const fashion = form.fashion || {};
  if (fashion.modelHeightCm != null && (!Number.isInteger(fashion.modelHeightCm) || fashion.modelHeightCm < 100 || fashion.modelHeightCm > 220)) set('fashion.modelHeightCm', 'Enter a height between 100 and 220 cm.');
  return errors;
}

export const DEFAULT_MIN_IMAGES = 4;
const STOCK_POLICY_VALUES = STOCK_POLICIES.map((policy) => policy.value);

/**
 * Publication readiness, mirroring Backend/src/modules/catalog/publication.ts. Works on the editor form and on the
 * admin product DTO (both expose variants, media, translations, attributes and sizeChartIds).
 * Returns one entry per rule: { id, path, ok, message }. `message` always describes what is needed.
 */
export function publishReadiness(product, { minImages = DEFAULT_MIN_IMAGES, status = 'published', publishAt = null, now = new Date() } = {}) {
  const min = Math.max(1, Number.isInteger(Number(minImages)) ? Number(minImages) : DEFAULT_MIN_IMAGES);
  const names = product.translations || {};
  const active = (product.variants || []).filter((variant) => variant.status !== 'archived' && !variant.archivedAt && variant.active !== false);
  const media = product.media || [];
  const primaryCount = media.filter((item) => item.role === 'primary').length;
  const imageCount = media.filter((item) => item.role === 'primary' || item.role === 'gallery').length;
  const priced = active.some((variant) => isMoney(variant.regularPrice) && new Decimal(variant.regularPrice).greaterThan(0));
  const badPolicy = active.find((variant) => !STOCK_POLICY_VALUES.includes(variant.stockPolicy || 'deny'));
  const preorderGap = active.some((variant) => (variant.stockPolicy || 'deny') === 'preorder' && !variant.preorderAvailableAt);
  const needsSizeChart = (product.attributes || []).some((item) => item.variation && String(item.key || '').toLowerCase() === 'size');
  const checks = [
    { id: 'name-en', path: 'translations.en.name', ok: Boolean(names.en?.name?.trim()), message: 'Add the English name.' },
    { id: 'name-bn', path: 'translations.bn.name', ok: Boolean(names.bn?.name?.trim()), message: 'Add the Bangla name.' },
    { id: 'slug', path: 'slug', ok: Boolean(product.slug?.trim()), message: 'Add a URL slug.' },
    { id: 'category', path: 'categoryId', ok: Boolean(product.categoryId), message: 'Choose a primary category.' },
    { id: 'variant', path: 'variants', ok: active.length > 0 && priced && !badPolicy && !preorderGap, message: !active.length ? 'Keep at least one active variant.' : !priced ? 'Give an active variant a price above zero.' : badPolicy ? 'Fix the stock policy of a variant.' : 'Add a preorder availability date.' },
    { id: 'primary-image', path: 'media', ok: primaryCount >= 1, message: 'Choose a primary image.' },
    { id: 'image-count', path: 'media', ok: imageCount >= min, message: `Add at least ${min} product images (${Math.min(imageCount, min)} of ${min}).` },
  ];
  if (needsSizeChart) checks.push({ id: 'size-chart', path: 'sizeChartIds', ok: (product.sizeChartIds || []).length > 0, message: 'Assign a size chart (this product has a size option).' });
  if (status === 'scheduled') {
    const at = publishAt ? new Date(publishAt) : null;
    checks.push({ id: 'publish-at', path: 'publishAt', ok: Boolean(at) && !Number.isNaN(at.getTime()) && at > now, message: 'Choose a future publication time.' });
  }
  return checks;
}

/** What still blocks publishing (BR-CAT-001). Used for the checklist next to the publish button. */
export function publishBlockers(form, options) {
  return publishReadiness(form, options).filter((check) => !check.ok);
}

/** Backend `fieldErrors` ({ path: string[] }) to a flat { path: message } map; `_form` is kept under that key. */
export function mapFieldErrors(fieldErrors) {
  if (!fieldErrors || typeof fieldErrors !== 'object') return {};
  return Object.fromEntries(Object.entries(fieldErrors).map(([path, messages]) => [path, Array.isArray(messages) ? messages[0] : String(messages)]).filter(([, message]) => message));
}

/** Which collapsible section holds a field path. */
export function sectionForPath(path) {
  if (/^(translations\.\w+\.(shortDescription|description|careText|materialText|seoTitle|seoDescription))/.test(path)) return 'content';
  if (path.startsWith('fashion')) return 'fashion';
  if (path.startsWith('variants') || path.startsWith('attributes')) return 'variants';
  if (path.startsWith('media')) return 'media';
  if (path.startsWith('relations')) return 'relations';
  if (path.startsWith('sizeChartIds') || path.startsWith('sizeCharts')) return 'variants';
  if (/^(visibility|taxClass|collectionIds|categoryIds|shippingProfile|lowStockThreshold)/.test(path)) return 'advanced';
  return 'general';
}

export const fieldId = (path) => `pf-${String(path).replace(/[^a-zA-Z0-9]+/g, '-')}`;

/** Order errors the way the page reads: general fields first. */
export function sortErrorPaths(paths) {
  const order = ['general', 'content', 'fashion', 'variants', 'media', 'relations', 'advanced'];
  return [...paths].sort((a, b) => order.indexOf(sectionForPath(a)) - order.indexOf(sectionForPath(b)));
}

export function isVersionConflict(error) {
  return error?.response?.status === 409 && (error.response.data?.error?.code === 'VERSION_CONFLICT' || /changed/i.test(error.response.data?.error?.message || ''));
}

/** Margin for display only; never used to submit anything. */
export function computeMargin(regular, sale, cost) {
  const valid = (value) => isMoney(value);
  if (!valid(regular)) return null;
  const selling = valid(sale) && new Decimal(sale).lessThan(regular) ? new Decimal(sale) : new Decimal(regular);
  if (!valid(cost)) return { selling: selling.toFixed(2), cost: null, profit: null, margin: null };
  const profit = selling.minus(cost);
  return { selling: selling.toFixed(2), cost: new Decimal(cost).toFixed(2), profit: profit.toFixed(2), margin: selling.isZero() ? null : profit.div(selling).times(100).toFixed(1), negative: profit.isNegative() };
}

export const cmToInch = (cm) => (cm === '' || cm == null || Number.isNaN(Number(cm)) ? '' : (Number(cm) / 2.54).toFixed(1));

/* ---------- Variant matrix ---------- */

export const comboSignature = (valueIds) => [...valueIds].sort().join('|');

/**
 * selections: [{ attribute: { id, key, values: [{ id, slug, value, translations }] }, valueIds: string[] }]
 * Returns every combination (cartesian product) in the attribute order given.
 */
export function buildMatrixRows(selections) {
  const groups = selections.map(({ attribute, valueIds }) => (attribute.values || []).filter((value) => valueIds.includes(value.id)).map((value) => ({ attribute, value })));
  if (!groups.length || groups.some((group) => !group.length)) return [];
  const product = groups.reduce((rows, group) => rows.flatMap((row) => group.map((entry) => [...row, entry])), [[]]);
  return product.map((entries) => ({
    signature: comboSignature(entries.map((entry) => entry.value.id)),
    attributeValueIds: entries.map((entry) => entry.value.id),
    attributes: Object.fromEntries(entries.map((entry) => [entry.attribute.key, entry.value.value])),
    title: entries.map((entry) => entry.value.translations?.en?.label || entry.value.value).join(' / '),
    skuParts: entries.map((entry) => String(entry.value.slug || entry.value.value).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')),
  }));
}

export const combinationCount = (selections) => (selections.length ? selections.reduce((total, selection) => total * selection.valueIds.length, 1) : 0);

/** Splits matrix rows into ones already present (edits are kept), new ones, and variants no longer in the matrix. */
export function diffMatrix(variants, rows) {
  const bySignature = new Map(variants.filter((variant) => variant.attributeValueIds?.length).map((variant) => [comboSignature(variant.attributeValueIds), variant]));
  const wanted = new Set(rows.map((row) => row.signature));
  return {
    added: rows.filter((row) => !bySignature.has(row.signature)),
    kept: rows.filter((row) => bySignature.has(row.signature)),
    orphaned: variants.filter((variant) => variant.attributeValueIds?.length && !wanted.has(comboSignature(variant.attributeValueIds))),
  };
}

export function uniqueSku(base, taken) {
  const lower = new Set([...taken].map((sku) => sku.toLowerCase()));
  const root = base.slice(0, 96);
  if (!lower.has(root.toLowerCase())) return root;
  let n = 2;
  while (lower.has(`${root}-${n}`.toLowerCase())) n += 1;
  return `${root}-${n}`;
}

/**
 * Adds the missing combinations to the variant list. Existing variants (and any edits on them) are untouched,
 * including ones that fell out of the selection: archiving those is a separate, explicit action.
 * Untouched placeholder variants (new, no price, no attributes) are dropped once real combinations exist.
 */
export function applyMatrix(variants, rows, { skuPrefix = '', regularPrice = '', stockPolicy = 'deny', initialStock = '0' } = {}) {
  const { added } = diffMatrix(variants, rows);
  if (!added.length) return variants;
  const kept = variants.filter((variant) => !(!variant.id && !variant.attributeValueIds?.length && !variant.regularPrice && !variant.sku));
  const taken = new Set(kept.map((variant) => variant.sku).filter(Boolean));
  const created = added.map((row) => {
    const sku = uniqueSku([skuPrefix, ...row.skuParts].filter(Boolean).join('-'), taken);
    taken.add(sku);
    return newVariant({ sku, title: row.title, attributes: row.attributes, attributeValueIds: row.attributeValueIds, regularPrice, stockPolicy, initialStock });
  });
  return ensureDefaultVariant([...kept, ...created]);
}

/** Product attribute list entry for the variation attributes chosen in the matrix dialog. */
export function syncVariationAttributes(attributes, selections) {
  const chosen = new Set(selections.map((selection) => selection.attribute.id));
  const existing = new Map(attributes.map((item) => [item.attributeId, item]));
  const merged = attributes.map((item) => (chosen.has(item.attributeId) ? { ...item, variation: true } : item));
  for (const { attribute } of selections) {
    if (!existing.has(attribute.id)) merged.push({ attributeId: attribute.id, key: attribute.key, label: attribute.translations?.en?.label || attribute.key, variation: true, visible: true });
  }
  return merged;
}

/* ---------- Optimistic concurrency ---------- */

const FIELD_LABELS = { slug: 'URL slug', categoryId: 'Primary category', brandId: 'Brand', type: 'Type', status: 'Status', featured: 'Featured', visibility: 'Visibility', taxClass: 'Tax class', publishAt: 'Publish time' };

/** Human summary of what changed on the server since the editor loaded (for the conflict banner). */
export function describeServerChanges(baseline, latest) {
  const changes = [];
  for (const [key, label] of Object.entries(FIELD_LABELS)) {
    if (String(baseline[key] ?? '') !== String(latest[key] ?? '')) changes.push(`${label} is now "${latest[key] || 'none'}"`);
  }
  for (const locale of ['en', 'bn']) {
    for (const [key, value] of Object.entries(latest.translations[locale])) {
      if ((baseline.translations[locale][key] || '') !== (value || '')) changes.push(`${locale === 'en' ? 'English' : 'Bangla'} ${key} was edited`);
    }
  }
  const before = new Map(baseline.variants.map((variant) => [variant.id, variant]));
  const after = new Map(latest.variants.map((variant) => [variant.id, variant]));
  for (const variant of latest.variants) {
    const old = before.get(variant.id);
    if (!old) changes.push(`Variant ${variant.sku} was added`);
    else if (old.version !== variant.version) changes.push(`Variant ${variant.sku} was edited`);
  }
  for (const variant of baseline.variants) if (variant.id && !after.has(variant.id)) changes.push(`Variant ${variant.sku} was archived`);
  if (baseline.media.length !== latest.media.length || baseline.media.some((item, index) => item.mediaId !== latest.media[index]?.mediaId || item.role !== latest.media[index]?.role)) changes.push('Product images were changed');
  return changes;
}

/**
 * Applies the user's unsaved edits on top of the latest server version (an explicit "keep my edits" choice):
 * takes the server's product and variant versions and on-hand baselines, drops variants that no longer exist.
 */
export function rebaseOnto(form, latest) {
  const live = new Map(latest.variants.filter((variant) => variant.id).map((variant) => [variant.id, variant]));
  const dropped = [];
  const variants = form.variants.flatMap((variant) => {
    if (!variant.id) return [variant];
    const current = live.get(variant.id);
    if (!current) { dropped.push(variant.sku); return []; }
    return [{ ...variant, version: current.version, stockBaseline: current.stockBaseline, reserved: current.reserved, effectiveThreshold: current.effectiveThreshold }];
  });
  return { form: { ...form, version: latest.version, variants: variants.length ? variants : latest.variants }, dropped };
}

/** Stable string used to detect unsaved edits. Ignores values that change without user input (upload processing, previews). */
export function snapshotOf(form) {
  return JSON.stringify({
    ...form,
    archivedVariantCount: undefined,
    media: form.media.map(({ assetStatus, previewUrl, width, height, ...rest }) => rest),
    sizeCharts: undefined,
    variants: form.variants.map(({ reserved, effectiveThreshold, ...rest }) => rest),
  });
}

const PATH_LABELS = {
  slug: 'Slug', categoryId: 'Primary category', brandId: 'Brand', status: 'Status', publishAt: 'Publish time', variants: 'Variants', media: 'Images', type: 'Type',
  sizeChartIds: 'Size chart', lowStockThreshold: 'Low stock alert',
  'translations.en.name': 'English name', 'translations.bn.name': 'Bangla name', 'fashion.modelHeightCm': 'Model height',
};
const FIELD_NAMES = { sku: 'SKU', title: 'title', regularPrice: 'regular price', salePrice: 'sale price', costPrice: 'cost price', initialStock: 'stock', lowStockThreshold: 'low stock alert', stockPolicy: 'stock policy', saleStartsAt: 'sale start', saleEndsAt: 'sale end', preorderAvailableAt: 'preorder date', weightGrams: 'weight', barcode: 'barcode', mediaId: 'file', altEn: 'English alt text', altBn: 'Bangla alt text' };

/** Readable name for a field path in the error summary. */
export function labelForPath(path) {
  if (PATH_LABELS[path]) return PATH_LABELS[path];
  const variant = /^variants\.(\d+)\.(.+)$/.exec(path);
  if (variant) return `Variant ${Number(variant[1]) + 1} ${FIELD_NAMES[variant[2]] || variant[2]}`;
  const image = /^media\.(\d+)\.(.+)$/.exec(path);
  if (image) return `Image ${Number(image[1]) + 1} ${FIELD_NAMES[image[2]] || image[2]}`;
  const translation = /^translations\.(en|bn)\.(.+)$/.exec(path);
  if (translation) return `${translation[1] === 'en' ? 'English' : 'Bangla'} ${translation[2].replace(/([A-Z])/g, ' $1').toLowerCase()}`;
  return path === '_form' ? 'Product' : path.replace(/([A-Z])/g, ' $1').replace(/\./g, ' ');
}

/** `YYYY-MM-DD` (local day) to the ISO instant the API filters on. `end` is the last millisecond of that day. */
export function dayBoundIso(day, edge) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return undefined;
  const date = new Date(`${day}T${edge === 'end' ? '23:59:59.999' : '00:00:00'}`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** Active (non-archived) variants only; the list endpoint also returns archived ones. */
export const activeVariants = (variants) => (variants || []).filter((variant) => variant.status !== 'archived' && variant.active !== false);

/** Lowest regular price across active variants as a 2dp string, or null. */
export function startingPrice(variants) {
  const prices = activeVariants(variants).map((variant) => variant.regularPrice).filter((price) => MONEY_RE.test(String(price ?? '')));
  if (!prices.length) return null;
  return prices.reduce((min, price) => (new Decimal(price).lessThan(min) ? new Decimal(price) : min), new Decimal(prices[0])).toFixed(2);
}
