'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const cookieName = 'ee_consent';
function readConsent() { const match = document.cookie.split('; ').find((item) => item.startsWith(`${cookieName}=`)); try { return match ? JSON.parse(decodeURIComponent(match.split('=').slice(1).join('='))) : null; } catch { return null; } }
function persist(value) { document.cookie = `${cookieName}=${encodeURIComponent(JSON.stringify(value))}; Max-Age=31536000; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`; window.dispatchEvent(new CustomEvent('ee:consent', { detail: value })); }

export function ConsentManager({ settings }) {
  const [consent, setConsent] = useState(undefined); const [open, setOpen] = useState(false);
  useEffect(() => { queueMicrotask(() => setConsent(readConsent())); const show = () => setOpen(true); window.addEventListener('ee:consent-preferences', show); return () => window.removeEventListener('ee:consent-preferences', show); }, []);
  useEffect(() => {
    if (!consent?.analytics || !settings?.publicMeasurementId || settings.provider !== 'ga4' || document.querySelector('[data-ee-analytics]')) return;
    const script = document.createElement('script'); script.async = true; script.dataset.eeAnalytics = 'true'; script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(settings.publicMeasurementId)}`; document.head.append(script);
    const analyticsWindow = /** @type {any} */ (window); analyticsWindow.dataLayer = analyticsWindow.dataLayer || []; analyticsWindow.gtag = function gtag() { analyticsWindow.dataLayer.push(arguments); }; analyticsWindow.gtag('js', new Date()); analyticsWindow.gtag('config', settings.publicMeasurementId, { anonymize_ip: true, allow_google_signals: false });
  }, [consent, settings]);
  if (consent === undefined || (!settings?.consentRequired && !open)) return null;
  if (consent && !open) return <button type="button" className="fixed bottom-3 left-3 z-40 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-muted)] shadow-[var(--shadow-sm)] transition hover:text-[var(--color-primary)]" onClick={() => setOpen(true)}>Cookie preferences</button>;
  const choose = (analytics) => { const value = { essential: true, analytics, updatedAt: new Date().toISOString() }; persist(value); setConsent(value); setOpen(false); };
  return <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-md)] sm:p-6" role="dialog" aria-modal="true" aria-labelledby="consent-title"><p className="eyebrow">Your privacy</p><h2 id="consent-title" className="mt-2 text-xl font-semibold tracking-[-.025em]">Privacy choices</h2><p className="mt-2 max-w-[65ch] text-sm leading-6 muted">Essential cookies keep your cart and account secure. Optional analytics help improve the shop and load only with your permission.</p><div className="mt-5 flex flex-wrap gap-3"><Button onClick={() => choose(true)}>Allow analytics</Button><Button variant="secondary" onClick={() => choose(false)}>Essential only</Button>{consent ? <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button> : null}</div></div>;
}
