// Pure helpers for the size chart and attribute admin screens.

export const COLUMN_KEY_RE = /^[a-z][a-z0-9_]*$/;
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const HEX_RE = /^#[0-9a-fA-F]{6}$/;
export const SUGGESTED_COLUMNS = ['bust', 'chest', 'waist', 'hip', 'length', 'sleeve', 'shoulder'];

/** Centimetres to inches, one decimal; blank or invalid input gives ''. */
export function cmToInch(value) {
  if (value === '' || value == null) return '';
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return '';
  return (Math.round((number / 2.54) * 10) / 10).toFixed(1);
}

/** 'Navy Blue / Dark!' -> 'navy-blue-dark' (matches the backend slug pattern). */
export function slugify(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

/** Free text to a measurement key ('Waist (cm)' -> 'waist_cm'); '' when nothing usable is left. */
export function columnKeyFromLabel(text) {
  const key = String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  return /^[a-z]/.test(key) ? key : '';
}

export function titleCaseKey(key) {
  return String(key || '').split('_').filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
}

export function moveItem(list, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export const emptyChart = () => ({
  name: '', titleEn: '', titleBn: '', units: 'cm', version: null,
  columns: ['chest', 'waist', 'hip'],
  rows: [{ labelEn: '', labelBn: '', cells: { chest: '', waist: '', hip: '' } }],
});

/** API chart to editor state: columns are the union of cell keys, in first-seen order. */
export function chartToForm(chart) {
  const columns = [];
  for (const row of chart.rows || []) for (const key of Object.keys(row.cells || {})) if (!columns.includes(key)) columns.push(key);
  return {
    name: chart.name || '', titleEn: chart.titleEn || '', titleBn: chart.titleBn || '', units: chart.units || 'cm', version: chart.version ?? null,
    columns,
    rows: (chart.rows || []).map((row) => ({ labelEn: row.labelEn, labelBn: row.labelBn, cells: Object.fromEntries(columns.map((key) => [key, row.cells?.[key] == null ? '' : String(row.cells[key])])) })),
  };
}

/** Editor state to the API payload; blank cells are dropped (a row needs at least one measurement). */
export function formToChartPayload(form) {
  const payload = {
    name: form.name.trim(), units: form.units, titleEn: form.titleEn.trim(), titleBn: form.titleBn.trim(),
    rows: form.rows.map((row) => ({
      labelEn: row.labelEn.trim(), labelBn: row.labelBn.trim(),
      cells: Object.fromEntries(form.columns.filter((key) => String(row.cells[key] ?? '').trim() !== '').map((key) => [key, Number(row.cells[key])])),
    })),
  };
  if (form.version != null) payload.version = form.version;
  return payload;
}

/** Client-side checks mirroring the backend schema; returns a flat { path: message } map. */
export function validateChartForm(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Enter a name.';
  if (!form.titleEn.trim()) errors.titleEn = 'Enter an English title.';
  if (!form.titleBn.trim()) errors.titleBn = 'Enter a Bangla title.';
  if (!form.columns.length) errors.columns = 'Add at least one measurement column.';
  if (!form.rows.length) errors.rows = 'Add at least one size.';
  if (form.rows.length > 40) errors.rows = 'A chart can have at most 40 sizes.';
  form.rows.forEach((row, index) => {
    if (!row.labelEn.trim()) errors[`rows.${index}.labelEn`] = 'Enter a size label.';
    if (!row.labelBn.trim()) errors[`rows.${index}.labelBn`] = 'Enter a Bangla label.';
    let filled = 0;
    for (const key of form.columns) {
      const raw = String(row.cells[key] ?? '').trim();
      if (raw === '') continue;
      filled += 1;
      const number = Number(raw);
      if (!Number.isFinite(number) || number < 0 || number > 10000) errors[`rows.${index}.cells.${key}`] = 'Use a number from 0 to 10,000.';
    }
    if (!filled && !errors[`rows.${index}.cells`]) errors[`rows.${index}.cells`] = 'Add at least one measurement.';
  });
  return errors;
}
