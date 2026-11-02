'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '@/lib/api/cart-api';
import { trackCommerceEvent } from '@/lib/analytics';

/** Backend-owned cart: the query mirrors the server response after every mutation. */
export function useCart(locale) {
  const client = useQueryClient();
  const key = ['cart', locale];
  const cart = useQuery({ queryKey: key, queryFn: () => cartApi.current(locale) });
  const replace = (data) => client.setQueryData(key, data);
  // A failed update (e.g. VERSION_CONFLICT) reloads the authoritative cart.
  const recover = () => client.invalidateQueries({ queryKey: key });
  const add = useMutation({
    mutationFn: ({ variantId, quantity }) => cartApi.add(variantId, quantity, locale),
    onSuccess: (data, variables) => { replace(data); trackCommerceEvent('add_to_cart', { variantId: variables.variantId, quantity: variables.quantity }); }
  });
  const update = useMutation({ mutationFn: ({ id, quantity, version }) => cartApi.update(id, quantity, locale, version), onSuccess: replace, onError: recover });
  const remove = useMutation({
    mutationFn: (id) => cartApi.remove(id, locale),
    onSuccess: (data) => { replace(data); trackCommerceEvent('remove_from_cart', {}); },
    onError: recover
  });
  const applyCoupon = useMutation({ mutationFn: (code) => cartApi.applyCoupon(code, locale), onSuccess: (data) => { replace(data); trackCommerceEvent('coupon_result', { success: true }); } });
  const removeCoupon = useMutation({ mutationFn: (code) => cartApi.removeCoupon(code, locale), onSuccess: replace });
  return { cart, add, update, remove, applyCoupon, removeCoupon };
}
