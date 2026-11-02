import { describe, expect, it } from 'vitest';
import { chartToForm, cmToInch, columnKeyFromLabel, formToChartPayload, moveItem, slugify, validateChartForm } from '../components/admin/catalog/catalog-logic';

describe('catalog logic', () => {
  it('converts cm to inches with one decimal', () => {
    expect(cmToInch('88')).toBe('34.6');
    expect(cmToInch(2.54)).toBe('1.0');
    expect(cmToInch('')).toBe('');
    expect(cmToInch('abc')).toBe('');
  });
  it('slugifies to the backend pattern', () => {
    expect(slugify(' Navy Blue / Dark! ')).toBe('navy-blue-dark');
    expect(slugify('Café')).toBe('cafe');
    expect(slugify('---')).toBe('');
  });
  it('derives measurement keys', () => {
    expect(columnKeyFromLabel('Waist (cm)')).toBe('waist_cm');
    expect(columnKeyFromLabel('9 lives')).toBe('');
  });
  it('moves items within bounds', () => {
    expect(moveItem([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
  });
  it('round-trips a chart and drops blank cells', () => {
    const form = chartToForm({ name: 'A', titleEn: 'A', titleBn: 'এ', units: 'cm', version: 2, rows: [{ labelEn: 'S', labelBn: 'এস', cells: { chest: 88, waist: 70 } }, { labelEn: 'M', labelBn: 'এম', cells: { chest: 92 } }] });
    expect(form.columns).toEqual(['chest', 'waist']);
    expect(form.rows[1].cells.waist).toBe('');
    const payload = formToChartPayload(form);
    expect(payload.rows[1].cells).toEqual({ chest: 92 });
    expect(payload.version).toBe(2);
    expect(validateChartForm(form)).toEqual({});
  });
  it('flags invalid charts', () => {
    const errors = validateChartForm({ name: '', titleEn: 'x', titleBn: 'y', units: 'cm', columns: ['chest'], rows: [{ labelEn: 'S', labelBn: '', cells: { chest: '' } }] });
    expect(errors.name).toBeTruthy();
    expect(errors['rows.0.labelBn']).toBeTruthy();
    expect(errors['rows.0.cells']).toBeTruthy();
  });
});
