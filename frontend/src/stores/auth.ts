"use client";

import { create } from "zustand";

export type User = { id: string; email: string };

const API_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "/api").replace(/\/$/, "")
    : "";

type AuthState = {
  user: User | null;
  /** GET /me 호출 중 (가드에서 사용) */
  checking: boolean;
};

type AuthActions = {
  setUser: (user: User | null) => void;
  /** GET /me with credentials. 성공 시 user 설정 후 true, 실패 시 false */
  checkAuth: () => Promise<boolean>;
  /** POST /auth/logout 호출 후 user null */
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  checking: false,

  setUser: (user) => set({ user }),

  checkAuth: async () => {
    if (!API_URL) return false;
    set({ checking: true });
    try {
      const res = await fetch(`${API_URL}/me`, { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as { user?: User };
      if (res.ok && data.user) {
        set({ user: data.user, checking: false });
        return true;
      }
      set({ user: null, checking: false });
      return false;
    } catch {
      set({ user: null, checking: false });
      return false;
    }
  },

  logout: async () => {
    if (API_URL) {
      try {
        await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
      } catch {
        /* ignore */
      }
    }
    set({ user: null });
  },
}));
