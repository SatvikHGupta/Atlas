'use client';

import { create } from 'zustand';

// BUG FIX: sidebarOpen/toggleSidebar/setSidebar were dead code in the old app (state existed, nothing read it) - dropped rather than ported.
// Monotonic id: Date.now() collided when two toasts were added in the same millisecond (duplicate React keys).
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
