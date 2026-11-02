const KEY = 'ee_attribution';
const PARAMS = { utm_source: 'utmSource', utm_medium: 'utmMedium', utm_campaign: 'utmCampaign', utm_content: 'utmContent', utm_term: 'utmTerm', fbclid: 'fbclid', gclid: 'gclid' };

/**
 * First-touch campaign parameters for order-source reporting (BE-ATTR-001).
 * Holds no personal data; stored per tab session and safe to lose.
 */
export function captureAttribution(url) {
  try {
    if (window.sessionStorage.getItem(KEY)) return;
    const params = new URL(url).searchParams;
    const found = Object.entries(PARAMS).filter(([param]) => params.get(param)).map(([param, key]) => [key, params.get(param).slice(0, 200)]);
    if (!found.length) return;
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...Object.fromEntries(found), landingPath: new URL(url).pathname.slice(0, 200) }));
  } catch { /* storage unavailable */ }
}

export function readAttribution() {
  try { return JSON.parse(window.sessionStorage.getItem(KEY) || 'null'); } catch { return null; }
}
