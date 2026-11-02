import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...values) => twMerge(clsx(values));
/**
 * Display-only BDT formatting ("৳1,250" / "৳১,২৫০"). Whole taka amounts drop
 * the ".00"; the backend decimal string stays the source of truth.
 */
export function formatMoney(value, locale = 'en') {
  const text = String(value ?? '0');
  const amount = Number(text);
  if (!Number.isFinite(amount)) return '৳0';
  const bangla = locale === 'bn' || locale === 'bn-BD';
  const hasPaisa = Math.round(Math.abs(amount) * 100) % 100 !== 0;
  const digits = new Intl.NumberFormat(bangla ? 'bn-BD' : 'en-IN', { minimumFractionDigits: hasPaisa ? 2 : 0, maximumFractionDigits: 2 }).format(Math.abs(amount));
  return `${amount < 0 ? '−' : ''}৳${digits}`;
}

/** Whole-number discount percentage between two decimal strings, or 0. */
export function discountPercent(regular, sale) {
  const before = Number(regular);
  const after = Number(sale);
  if (!(before > 0) || !(after >= 0) || after >= before) return 0;
  return Math.round(((before - after) / before) * 100);
}

const RETURN_PATH = /^\/(?:en|bn)(?:[/?#]|$)/;

/** Accepts only same-origin, locale-prefixed relative paths; anything else yields the fallback. */
export function safeReturnPath(value, fallback) {
  if (typeof value !== 'string' || !RETURN_PATH.test(value) || /[\\\u0000-\u001f]/.test(value)) return fallback;
  try {
    const url = new URL(value, 'https://return.invalid');
    if (url.origin !== 'https://return.invalid' || !RETURN_PATH.test(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/** Mirrors the backend phone normaliser: 01XXXXXXXXX with an optional +88/88 prefix and separators. */
export function isBangladeshiPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  const local = digits.startsWith('880') ? `0${digits.slice(3)}` : digits;
  return /^01[3-9]\d{8}$/.test(local);
}

/** CMS links: HTTPS absolute URLs or site-relative paths (prefixed with the locale); everything else is dropped. */
export function safeContentHref(value, locale) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const url = value.trim();
  if (/^https:\/\/[^/\\]/i.test(url)) return url;
  if (!url.startsWith('/') || url.startsWith('//') || url.includes('\\')) return null;
  return RETURN_PATH.test(url) ? url : `/${locale}${url}`;
}
