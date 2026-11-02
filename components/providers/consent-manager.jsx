'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

const cookieName = 'ee_consent';
function readConsent() { const match = document.cookie.split('; ').find((item) => item.startsWith(`${cookieName}=`)); try { return match ? JSON.parse(decodeURIComponent(match.split('=').slice(1).join('='))) : null; } catch { return null; } }
function persist(value) { document.cookie = `${cookieName}=${encodeURIComponent(JSON.stringify(value))}; Max-Age=31536000; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`; window.dispatchEvent(new CustomEvent('ee:consent', { detail: value })); }

/** Footer link that reopens the privacy choices (FE-ANALYTICS-001). */
export function ConsentLink() {
  const t = useTranslations('Consent');
  return <button type="button" className="hover:text-[var(--color-text)]" onClick={() => window.dispatchEvent(new CustomEvent('ee:consent-preferences'))}>{t('preferences')}</button>;
}

export function ConsentManager({ settings }) {
  const t = useTranslations('Consent');
  const [consent, setConsent] = useState(undefined); const [open, setOpen] = useState(false);
  useEffect(() => { queueMicrotask(() => setConsent(readConsent())); const show = () => setOpen(true); window.addEventListener('ee:consent-preferences', show); return () => window.removeEventListener('ee:consent-preferences', show); }, []);
  useEffect(() => {
    if (!consent?.analytics || !settings?.publicMeasurementId || settings.provider !== 'ga4' || document.querySelector('[data-ee-analytics]')) return;
    const script = document.createElement('script'); script.async = true; script.dataset.eeAnalytics = 'true'; script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(settings.publicMeasurementId)}`; document.head.append(script);
    const analyticsWindow = /** @type {any} */ (window); analyticsWindow.dataLayer = analyticsWindow.dataLayer || []; analyticsWindow.gtag = function gtag() { analyticsWindow.dataLayer.push(arguments); }; analyticsWindow.gtag('js', new Date()); analyticsWindow.gtag('config', settings.publicMeasurementId, { anonymize_ip: true, allow_google_signals: false });
  }, [consent, settings]);
  if (consent === undefined || (!open && (consent || !settings?.consentRequired))) return null;
  const choose = (analytics) => { const value = { essential: true, analytics, updatedAt: new Date().toISOString() }; persist(value); setConsent(value); setOpen(false); };
  return (
    <div className="fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-50 mx-auto max-w-2xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)] p-5 shadow-[var(--shadow-md)] md:bottom-4 sm:p-6" role="dialog" aria-modal="false" aria-labelledby="consent-title">
      <p className="eyebrow">{t('eyebrow')}</p>
      <h2 id="consent-title" className="mt-1 text-lg font-medium">{t('title')}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{t('body')}</p>
      <div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => choose(true)}>{t('allow')}</Button><Button variant="secondary" onClick={() => choose(false)}>{t('essential')}</Button>{consent ? <Button variant="ghost" onClick={() => setOpen(false)}>{t('cancel')}</Button> : null}</div>
    </div>
  );
}
