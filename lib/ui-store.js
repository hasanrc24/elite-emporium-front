import { create } from 'zustand';

/**
 * Non-persisted storefront UI state. `lastOrder` hands the just-placed order
 * summary to the success page in memory only (never Web Storage).
 */
export const useUiStore = create((set) => ({
  cartOpen: false,
  searchOpen: false,
  menuOpen: false,
  lastOrder: null,
  setCartOpen: (cartOpen) => set({ cartOpen }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  setLastOrder: (lastOrder) => set({ lastOrder }),
}));
