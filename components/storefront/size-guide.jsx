'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Ruler } from 'lucide-react';
import { cmToInch, inchToCm } from '@/lib/storefront';
import { Sheet } from './sheet';
import { useStorefront } from './storefront-context';

function convert(value, from, to) {
  if (from === to || value === '' || value == null) return value;
  const text = String(value);
  // Ranges such as "34-36" convert each side.
  if (/^\s*\d+(\.\d+)?\s*[-–]\s*\d+(\.\d+)?\s*$/.test(text)) return text.split(/[-–]/).map((part) => convert(part.trim(), from, to)).join('–');
  if (!/^\s*\d+(\.\d+)?\s*$/.test(text)) return text;
  return to === 'in' ? cmToInch(text) : inchToCm(text);
}

export function SizeGuideButton({ product, className = '' }) {
  const t = useTranslations('SizeGuide');
  const { settings } = useStorefront();
  const [open, setOpen] = useState(false);
  const charts = product.sizeCharts || [];
  const baseUnit = charts[0]?.units === 'in' ? 'in' : 'cm';
  const [unit, setUnit] = useState(baseUnit);
  const fashion = product.fashion || {};
  const tp = useTranslations('Product');
  const tc = useTranslations('Common');
  const whatsapp = settings?.store?.whatsappUrl;
  if (!charts.length && !fashion.fitNote && !fashion.modelSize) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`inline-flex items-center gap-1.5 text-[13px] underline underline-offset-4 ${className}`}><Ruler size={15} aria-hidden="true" />{t('title')}</button>
      <Sheet open={open} onOpenChange={setOpen} side="right" title={t('title')} description={t('description')} closeLabel={tc('close')}>
        <div className="grid gap-6 p-5">
          {fashion.fitNote || fashion.modelSize ? (
            <div className="grid gap-1 rounded-[var(--radius)] bg-[var(--color-surface)] p-4 text-sm">
              {fashion.fitNote ? <p className="font-medium">{tp(`fitNotes.${fashion.fitNote}`)}</p> : null}
              {fashion.fitType ? <p className="text-[var(--color-muted)]">{tp(`fitTypes.${fashion.fitType}`)}</p> : null}
              {fashion.modelHeightCm && fashion.modelSize ? <p className="text-[var(--color-muted)]">{tp('model', { height: fashion.modelHeightCm, size: fashion.modelSize })}</p> : null}
            </div>
          ) : null}
          {charts.length ? (
            <div role="radiogroup" aria-label={t('units')} className="inline-flex w-max rounded-full border border-[var(--color-border-strong)] p-0.5 text-sm">
              {['cm', 'in'].map((value) => <button key={value} type="button" role="radio" aria-checked={unit === value} onClick={() => setUnit(value)} className={`min-h-9 rounded-full px-4 ${unit === value ? 'bg-[var(--color-text)] text-[var(--color-bg)]' : ''}`}>{value === 'cm' ? t('cm') : t('inch')}</button>)}
            </div>
          ) : null}
          {charts.map((chart) => {
            const keys = [...new Set(chart.rows.flatMap((row) => Object.keys(row.cells || {})))];
            // Backend-converted values win; client conversion only covers older responses.
            const cell = (row, key) => {
              const converted = unit === 'in' ? row.inch : row.cm;
              if (converted && converted[key] != null) return converted[key];
              return convert(row.cells?.[key] ?? '—', chart.units === 'in' ? 'in' : 'cm', unit);
            };
            return (
              <div key={chart.id}>
                {chart.title ? <h3 className="mb-2 text-sm font-medium">{chart.title}</h3> : null}
                <div className="overflow-x-auto" role="region" tabIndex={0} aria-label={t('caption', { title: chart.title || t('title'), unit: unit === 'in' ? t('inch') : t('cm') })}>
                  <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
                    <caption className="sr-only">{t('caption', { title: chart.title || t('title'), unit: unit === 'in' ? t('inch') : t('cm') })}</caption>
                    <thead><tr className="border-b border-[var(--color-text)]"><th scope="col" className="py-2 pr-3 font-medium">{t('size')}</th>{keys.map((key) => <th key={key} scope="col" className="px-2 py-2 font-medium capitalize">{key}</th>)}</tr></thead>
                    <tbody>{chart.rows.map((row) => <tr key={row.label} className="border-b border-[var(--color-border)]"><th scope="row" className="py-2.5 pr-3 font-medium">{row.label}</th>{keys.map((key) => <td key={key} className="px-2 py-2.5 tabular-nums">{cell(row, key)}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              </div>
            );
          })}
          <div className="grid gap-1.5 text-[13px] text-[var(--color-muted)]">
            <p className="font-medium text-[var(--color-text)]">{t('howToMeasure')}</p>
            <p>{t('chest')}</p><p>{t('waist')}</p><p>{t('hip')}</p><p>{t('length')}</p>
          </div>
          {whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="rounded-[var(--radius)] border border-[var(--color-border)] p-4 text-sm underline-offset-4 hover:underline">{t('help')}</a> : null}
        </div>
      </Sheet>
    </>
  );
}
