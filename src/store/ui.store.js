'use client';

import { create } from 'zustand';

let nextToastId = 1;

export const useUIStore = create((set) => ({
  toasts: [],

  addToast: (message, type = 'info') => {
    const id = nextToastId++;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
