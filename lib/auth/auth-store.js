import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  status: 'checking', user: null,
  authenticated: (user) => set({ status: 'authenticated', user }),
  anonymous: () => set({ status: 'anonymous', user: null }),
  unavailable: () => set({ status: 'unavailable', user: null }),
}));
