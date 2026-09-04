const allowedEvents = new Set(['view_item', 'view_item_list', 'select_item', 'search', 'add_to_wishlist', 'remove_from_wishlist', 'add_to_cart', 'remove_from_cart', 'view_cart', 'begin_checkout', 'add_shipping_info', 'add_payment_info', 'coupon_result', 'purchase', 'refund', 'return_request']);
export function trackCommerceEvent(name, payload = {}) {
  if (!allowedEvents.has(name) || typeof window === 'undefined') return;
  const safe = Object.fromEntries(Object.entries(payload).filter(([key]) => !/(phone|email|address|token|userId|cost|note)/i.test(key)));
  window.dispatchEvent(new CustomEvent('ee:commerce', { detail: { name, payload: safe } }));
  const analyticsWindow = /** @type {any} */ (window);
  if (typeof analyticsWindow.gtag === 'function') analyticsWindow.gtag('event', name, safe);
}
