import { describe, expect, it } from 'vitest';
import { metaConsentGiven, toMetaEvent } from '@/lib/meta-tracking';

const meta = { provider: 'meta', publicMeasurementId: '123456789012345', consentRequired: true };

describe('meta consent gating', () => {
  it('needs an explicit analytics choice when consent is required', () => {
    expect(metaConsentGiven(meta, null)).toBe(false);
    expect(metaConsentGiven(meta, { analytics: false })).toBe(false);
    expect(metaConsentGiven(meta, { analytics: true })).toBe(true);
  });
  it('runs without a banner when consent is not required, but never after a refusal', () => {
    const open = { ...meta, consentRequired: false };
    expect(metaConsentGiven(open, null)).toBe(true);
    expect(metaConsentGiven(open, { analytics: false })).toBe(false);
  });
  it('ignores other providers and malformed pixel IDs', () => {
    expect(metaConsentGiven({ ...meta, provider: 'ga4' }, { analytics: true })).toBe(false);
    expect(metaConsentGiven({ ...meta, publicMeasurementId: 'G-ABC123' }, { analytics: true })).toBe(false);
  });
});

describe('commerce events to Meta events', () => {
  it('uses the order reference as the Purchase event ID so server and browser dedupe', () => {
    const event = toMetaEvent('purchase', { transaction_id: 'EE-ABC123', value: '1250.00', items: 2, contents: [{ id: 'p1', quantity: 2, price: '625.00' }] });
    expect(event.metaName).toBe('Purchase');
    expect(event.eventId).toBe('purchase_EE-ABC123');
    expect(event.params).toMatchObject({ value: 1250, currency: 'BDT', content_ids: ['p1'] });
  });
  it('maps product views and gives each event a unique ID', () => {
    const a = toMetaEvent('view_item', { item_id: 'p1', item_name: 'Shirt', price: '500' });
    const b = toMetaEvent('view_item', { item_id: 'p1', item_name: 'Shirt', price: '500' });
    expect(a.metaName).toBe('ViewContent');
    expect(a.eventId).not.toBe(b.eventId);
  });
  it('skips add-to-cart without a product ID and unrelated events', () => {
    expect(toMetaEvent('add_to_cart', { variantId: 'v1', quantity: 1 })).toBeNull();
    expect(toMetaEvent('view_cart', {})).toBeNull();
  });
});
