'use client';

import { createContext, useContext } from 'react';

const StorefrontContext = createContext({ locale: 'en', settings: {} });

/** Public storefront settings fetched once by the locale layout. */
export function StorefrontProvider({ locale, settings, children }) {
  return <StorefrontContext.Provider value={{ locale, settings: settings || {} }}>{children}</StorefrontContext.Provider>;
}

export function useStorefront() {
  return useContext(StorefrontContext);
}

/** Lowest active free-delivery threshold, or null when none is configured. */
export function freeDeliveryThreshold(settings) {
  const thresholds = (settings?.shippingMethods || []).map((method) => Number(method.freeThreshold)).filter((value) => Number.isFinite(value) && value > 0);
  return thresholds.length ? Math.min(...thresholds) : null;
}

export function deliveryEstimate(settings, code, locale) {
  const value = settings?.delivery?.estimates?.[code];
  return value ? value[locale] || value.en : null;
}
