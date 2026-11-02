import { readAttribution } from '@/lib/attribution';

/**
 * Meta Pixel (browser) plus Conversions API relay (server). Every event gets
 * one event ID that is sent to both, so Meta counts it once. Nothing runs
 * before the visitor has agreed (or when consent is not required).
 */
const PIXEL_ID = /^\d{8,20}$/;
const META_EVENTS = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', purchase: 'Purchase', search: 'Search', add_to_wishlist: 'AddToWishlist' };
// Purchase is created by the server from the order itself; the browser only fires the pixel.
const RELAYED = new Set(['ViewContent', 'AddToCart', 'InitiateCheckout', 'Search', 'AddToWishlist']);

const state = { allowed: false, pixelId: null, serverSide: false, initialized: false };

export function metaConsentGiven(settings, consent) {
  if (!settings || settings.provider !== 'meta' || !PIXEL_ID.test(String(settings.publicMeasurementId || ''))) return false;
  if (consent?.analytics === true) return true;
  return settings.consentRequired === false && !consent;
}

function loadPixel() {
  const metaWindow = /** @type {any} */ (window);
  if (metaWindow.fbq) return;
  const fbq = function fbq() { if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments); else fbq.queue.push(arguments); };
  fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
  metaWindow.fbq = fbq; if (!metaWindow._fbq) metaWindow._fbq = fbq;
  const script = document.createElement('script');
  script.async = true; script.src = 'https://connect.facebook.net/en_US/fbevents.js'; script.dataset.eeMetaPixel = 'true';
  document.head.append(script);
}

const pixel = (...args) => { const fbq = /** @type {any} */ (window).fbq; if (typeof fbq === 'function') fbq(...args); };

/** Called whenever the settings or the visitor's consent choice change. */
export function configureMetaTracking(settings, consent) {
  if (typeof window === 'undefined') return;
  const allowed = metaConsentGiven(settings, consent);
  if (!allowed) {
    if (state.initialized) pixel('consent', 'revoke');
    Object.assign(state, { allowed: false });
    return;
  }
  state.serverSide = settings.serverSide === true;
  state.pixelId = String(settings.publicMeasurementId);
  state.allowed = true;
  if (!state.initialized) {
    loadPixel();
    pixel('init', state.pixelId);
    pixel('track', 'PageView');
    state.initialized = true;
  } else pixel('consent', 'grant');
}

export function trackMetaPageView() {
  if (state.allowed && state.initialized) pixel('track', 'PageView');
}

function cookie(name) {
  const match = document.cookie.split('; ').find((item) => item.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

/** Click ID cookie (`_fbc`), or one built from the ad click ID in the landing URL. */
function clickId() {
  const stored = cookie('_fbc');
  if (stored) return stored;
  const fbclid = readAttribution()?.fbclid;
  return fbclid ? `fb.1.${Date.now()}.${fbclid}` : null;
}

/** Browser context attached to the checkout quote so the server can send Purchase. */
export function readMetaTracking() {
  if (typeof window === 'undefined' || !state.allowed || !state.serverSide) return null;
  return { consent: true, fbp: cookie('_fbp') || undefined, fbc: clickId() || undefined, sourceUrl: window.location.href };
}

const number = (value) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : undefined; };
const newEventId = (name) => `${name}_${(globalThis.crypto?.randomUUID?.() || `${Date.now()}${Math.random().toString(16).slice(2)}`).replace(/-/g, '')}`;

/** Maps an `ee:commerce` event to Meta's parameters; null when Meta has no matching event. */
export function toMetaEvent(name, payload = {}) {
  const metaName = META_EVENTS[name];
  if (!metaName) return null;
  let contents = []; let value = number(payload.value); let searchString; let contentName;
  if (name === 'view_item') { contents = payload.item_id ? [{ id: String(payload.item_id), quantity: 1, price: number(payload.price) }] : []; value = number(payload.price); contentName = payload.item_name; }
  else if (name === 'add_to_cart') {
    if (!payload.productId) return null; // catalog IDs must match across events
    const quantity = Number(payload.quantity) || 1; const price = number(payload.price);
    contents = [{ id: String(payload.productId), quantity, price }]; value = price == null ? undefined : price * quantity;
  } else if (name === 'add_to_wishlist') contents = payload.productId ? [{ id: String(payload.productId), quantity: 1 }] : [];
  else if (name === 'purchase') contents = Array.isArray(payload.contents) ? payload.contents : [];
  else if (name === 'search') searchString = payload.search_term;
  const params = { currency: 'BDT', ...(value == null ? {} : { value }), ...(searchString ? { search_string: searchString } : {}), ...(contentName ? { content_name: contentName } : {}), ...(payload.items ? { num_items: Number(payload.items) } : {}),
    ...(contents.length ? { contents: contents.map(({ id, quantity, price }) => ({ id, quantity, ...(price == null ? {} : { item_price: price }) })), content_ids: contents.map((item) => item.id), content_type: 'product' } : {}) };
  const eventId = name === 'purchase' ? `purchase_${payload.transaction_id}` : newEventId(metaName);
  return { metaName, params, eventId, contents, value, searchString, contentName };
}

export function trackMeta(name, payload) {
  if (typeof window === 'undefined' || !state.allowed || !state.initialized) return;
  const event = toMetaEvent(name, payload);
  if (!event || (name === 'purchase' && !payload?.transaction_id)) return;
  pixel('track', event.metaName, event.params, { eventID: event.eventId });
  if (!state.serverSide || !RELAYED.has(event.metaName)) return;
  relay(event);
}

async function relay(event) {
  try {
    const { browserApi } = await import('@/lib/api/browser-api');
    await browserApi.post('/tracking/events', {
      consent: true,
      fbp: cookie('_fbp') || undefined,
      fbc: clickId() || undefined,
      events: [{ name: event.metaName, eventId: event.eventId, sourceUrl: window.location.href, value: event.value, contents: event.contents.map(({ id, quantity, price }) => ({ id, quantity, ...(price == null ? {} : { price }) })), searchString: event.searchString, contentName: event.contentName }]
    }, { skipAuthRefresh: true });
  } catch { /* tracking must never affect the shopper */ }
}
