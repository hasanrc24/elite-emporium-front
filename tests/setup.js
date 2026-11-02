import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest runs without globals, so Testing Library cannot register its own cleanup.
afterEach(cleanup);

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;

// floating-ui (used by Radix popovers) probes `:popover-open` and `:modal`
// through Element.matches. jsdom's selector engine handles these extremely
// slowly, stalling every open popover for seconds; no jsdom element is ever
// in the top layer, so answer directly.
const nativeMatches = Element.prototype.matches;
Element.prototype.matches = function matches(selector) {
  if (selector === ':popover-open' || selector === ':modal') return false;
  return nativeMatches.call(this, selector);
};
