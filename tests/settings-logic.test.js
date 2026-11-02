import { describe, expect, it } from 'vitest';
import {
  SETTINGS_SECTIONS,
  isEqual,
  isFieldInactive,
  mapServerErrors,
  searchSettings,
  sectionFields,
  sectionGroups,
  sectionSummary,
  setPath,
  validateField,
  validateGroup,
  validateMethod
} from '@/components/admin/settings/settings-schema';

const BACKEND_GROUPS = ['store', 'ordering', 'inventory', 'catalog', 'delivery', 'confirmation', 'risk', 'checkout', 'tax', 'verification', 'returns', 'manualWallet', 'reviews', 'notifications', 'analytics', 'seo', 'maintenance'];

describe('settings layout', () => {
  it('covers every backend settings group', () => {
    const covered = new Set(SETTINGS_SECTIONS.flatMap(sectionGroups));
    expect([...covered].sort()).toEqual([...BACKEND_GROUPS].sort());
  });

  it('uses unique section ids and field targets', () => {
    const ids = SETTINGS_SECTIONS.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
    const targets = SETTINGS_SECTIONS.flatMap(sectionFields).map((field) => `${field.group}:${field.path}`);
    expect(new Set(targets).size).toBe(targets.length);
  });

  it('points every dependency at a toggle in the same group', () => {
    for (const field of SETTINGS_SECTIONS.flatMap(sectionFields).filter((item) => item.dependsOn)) {
      const parent = SETTINGS_SECTIONS.flatMap(sectionFields).find((item) => item.group === field.group && item.path === field.dependsOn);
      expect(parent?.type, `${field.group}.${field.path}`).toBe('toggle');
    }
  });
});

describe('setPath and isEqual', () => {
  it('sets nested values without mutating the original', () => {
    const original = { name: { en: 'A', bn: 'অ' } };
    const next = setPath(original, 'name.en', 'B');
    expect(next).toEqual({ name: { en: 'B', bn: 'অ' } });
    expect(original.name.en).toBe('A');
  });

  it('compares regardless of key order', () => {
    expect(isEqual({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 })).toBe(true);
    expect(isEqual({ a: 1 }, { a: 1, b: undefined })).toBe(true);
    expect(isEqual({ a: [1, 2] }, { a: [2, 1] })).toBe(false);
  });
});

describe('validateField', () => {
  it('checks number bounds and whole numbers', () => {
    const field = { type: 'number', min: 1, max: 999, label: 'Max' };
    expect(validateField(field, 5)).toBeNull();
    expect(validateField(field, 0)).toMatch(/1 or more/);
    expect(validateField(field, 1000)).toMatch(/999 or less/);
    expect(validateField(field, null)).toMatch(/Enter a number/);
    expect(validateField(field, 2.5)).toMatch(/whole number/);
  });

  it('leaves keys the backend has never stored to their defaults', () => {
    expect(validateField({ type: 'number', min: 1, label: 'Max' }, undefined)).toBeNull();
  });

  it('accepts money as a two-decimal string only', () => {
    const field = { type: 'money', label: 'Minimum' };
    expect(validateField(field, '500')).toBeNull();
    expect(validateField(field, '499.50')).toBeNull();
    expect(validateField(field, '499.555')).not.toBeNull();
    expect(validateField(field, '')).not.toBeNull();
  });

  it('requires both languages for required localized text', () => {
    const field = { type: 'localized', label: 'Store name', required: true, max: 255 };
    expect(validateField(field, { en: 'Elite', bn: 'এলিট' })).toBeNull();
    expect(validateField(field, { en: 'Elite', bn: ' ' })).toMatch(/Bangla/);
  });

  it('rejects non-web URLs and malformed emails', () => {
    expect(validateField({ type: 'url', label: 'Link' }, 'javascript:alert(1)')).not.toBeNull();
    expect(validateField({ type: 'url', label: 'Link' }, 'https://wa.me/8801700000000')).toBeNull();
    expect(validateField({ type: 'url', label: 'Link', nullable: true }, null)).toBeNull();
    expect(validateField({ type: 'email', label: 'Email' }, 'shop@')).not.toBeNull();
  });

  it('validates social links as named web addresses', () => {
    const field = { type: 'links', label: 'Social', max: 20 };
    expect(validateField(field, [{ label: 'Facebook', url: 'https://facebook.com/x' }])).toBeNull();
    expect(validateField(field, [{ label: '', url: 'https://facebook.com/x' }])).toMatch(/Link 1/);
  });
});

describe('validateGroup', () => {
  it('requires the high risk score above the medium one', () => {
    expect(validateGroup('risk', { enabled: true, mediumScore: 60, highScore: 60, newCustomerHighValue: '5000.00' })).toHaveProperty('highScore');
    expect(validateGroup('risk', { enabled: true, mediumScore: 30, highScore: 60, newCustomerHighValue: '5000.00' })).toEqual({});
  });

  it('enforces the order prefix format', () => {
    expect(validateGroup('ordering', { orderPrefix: 'ee 1' })).toHaveProperty('orderPrefix');
    expect(validateGroup('ordering', { orderPrefix: 'EE-1' })).toEqual({});
  });

  it('collects fields placed in other sections', () => {
    expect(validateGroup('delivery', { refundTimelineDays: 0, estimates: {} })).toHaveProperty('refundTimelineDays');
  });
});

describe('mapServerErrors', () => {
  it('folds nested backend paths onto the field that owns them', () => {
    expect(mapServerErrors('store', { 'name.bn': ['Required'], 'socialLinks.0.url': ['Invalid URL'], unknown: ['Bad'] })).toEqual({ name: 'Required', socialLinks: 'Invalid URL', _form: 'Bad' });
    expect(mapServerErrors('delivery', { 'estimates.inside_dhaka.en': ['Too long'] })).toEqual({ 'estimates.inside_dhaka': 'Too long' });
  });
});

describe('validateMethod', () => {
  const method = { labelEn: 'Inside Dhaka', labelBn: 'ঢাকার ভিতরে', flatRate: '80.00', freeThreshold: null, allowedPayments: ['cod'] };
  it('accepts a complete method', () => expect(validateMethod(method)).toEqual({}));
  it('requires a payment option and a valid rate', () => {
    expect(validateMethod({ ...method, allowedPayments: [] })).toHaveProperty('allowedPayments');
    expect(validateMethod({ ...method, flatRate: '8.999' })).toHaveProperty('flatRate');
    expect(validateMethod({ ...method, freeThreshold: 'abc' })).toHaveProperty('freeThreshold');
  });
});

describe('search and summaries', () => {
  it('finds fields by label and description', () => {
    const results = searchSettings('guest');
    expect(results.some((result) => result.section.id === 'checkout' && result.target === 'setting-ordering-allowGuestCheckout')).toBe(true);
    expect(searchSettings('v')).toEqual([]);
  });

  it('locks dependent fields while their toggle is off', () => {
    const field = sectionFields(SETTINGS_SECTIONS.find((section) => section.id === 'taxes')).find((item) => item.path === 'rate');
    expect(isFieldInactive(field, { enabled: false })).toBe(true);
    expect(isFieldInactive(field, { enabled: true })).toBe(false);
  });

  it('summarises section state for the overview', () => {
    expect(sectionSummary('taxes', { tax: { enabled: true, rate: '15' } })).toBe('VAT 15%');
    expect(sectionSummary('maintenance', { maintenance: { enabled: true } })).toBe('Store is closed');
  });
});
