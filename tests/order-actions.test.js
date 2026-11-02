import { describe, expect, it } from 'vitest';
import { availableOrderActions, orderActionButtons } from '@/components/admin/orders/order-actions';

const all = () => true;
const only = (...permissions) => (permission) => permissions.includes(permission);
const order = (extra = {}) => ({ id: 'o1', reference: 'EE-1', version: 3, orderStatus: 'confirmed', fulfillmentStatus: 'unfulfilled', confirmationStatus: 'confirmed', payments: [{ id: 'p1', method: 'cod', status: 'unpaid', amount: '1500.00' }], ...extra });

describe('availableOrderActions', () => {
  it('offers confirmation but not packing while the call is still open', () => {
    expect(availableOrderActions(order({ orderStatus: 'placed', confirmationStatus: 'pending' }), all)).toEqual(['confirm', 'cancel']);
  });

  it('follows the fulfilment workflow', () => {
    expect(availableOrderActions(order(), all)).toEqual(['pack', 'cancel']);
    expect(availableOrderActions(order({ orderStatus: 'processing', fulfillmentStatus: 'packed' }), all)).toEqual(['ship', 'cancel']);
    expect(availableOrderActions(order({ orderStatus: 'processing', fulfillmentStatus: 'shipped' }), all)).toEqual(['outForDelivery', 'deliver', 'rto']);
    expect(availableOrderActions(order({ orderStatus: 'processing', fulfillmentStatus: 'out_for_delivery' }), all)).toEqual(['deliver', 'rto']);
  });

  it('offers COD collection only after delivery while cash is unpaid', () => {
    expect(availableOrderActions(order({ orderStatus: 'processing', fulfillmentStatus: 'delivered' }), all)).toEqual(['codCollected']);
    expect(availableOrderActions(order({ orderStatus: 'completed', fulfillmentStatus: 'delivered', payments: [{ id: 'p1', method: 'cod', status: 'paid' }] }), all)).toEqual([]);
  });

  it('offers nothing on closed orders', () => {
    expect(availableOrderActions(order({ orderStatus: 'cancelled' }), all)).toEqual([]);
    expect(availableOrderActions(order({ orderStatus: 'processing', fulfillmentStatus: 'returned_to_origin' }), all)).toEqual([]);
  });

  it('respects permissions', () => {
    expect(availableOrderActions(order(), only('orders.cancel'))).toEqual(['cancel']);
    expect(availableOrderActions(order({ orderStatus: 'placed', confirmationStatus: 'pending' }), only('orders.progress'))).toEqual([]);
    expect(availableOrderActions(order(), only())).toEqual([]);
  });

  it('does not offer cancelling a paid order', () => {
    expect(availableOrderActions(order({ paymentStatus: 'paid' }), all)).toEqual(['pack']);
  });
});

describe('orderActionButtons', () => {
  it('never makes a destructive change the primary button', () => {
    const { primary, others } = orderActionButtons(order({ orderStatus: 'processing', fulfillmentStatus: 'shipped' }), all);
    expect(primary.key).toBe('outForDelivery');
    expect(others.map((item) => item.key)).toEqual(['deliver', 'rto']);
    expect(orderActionButtons(order(), only('orders.cancel')).primary).toBeNull();
  });
});
