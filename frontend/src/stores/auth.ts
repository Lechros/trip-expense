"use client";

import { create } from "zustand";

export type User = { id: string; email: string };

/** GET /me가 게스트 세션일 때 반환하는 값. 해당 트립의 memberId로 기본 결제자 등 사용 */
export type GuestSession = { guestId: string; tripId: string; memberId: string };

const API_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "/api").replace(/\/$/, "")
    : "";

type AuthState = {
  user: User | null;
  /** 게스트 세션 (POST /trips/join 게스트 성공 후 /me 응답) */
  guest: GuestSession | null;
  /** GET /me 호출 중 (가드에서 사용) */
  checking: boolean;
};

type AuthActions = {
  setUser: (user: User | null) => void;
  /** GET /me with credentials. 성공 시 user 또는 guest 설정 후 true, 실패 시 false */
  checkAuth: () => Promise<boolean>;
  /** POST /auth/logout 호출 후 user·guest null */
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  guest: null,
  checking: false,

  setUser: (user) => set((s) => ({ user, guest: user ? null : s.guest })),

  checkAuth: async () => {
    if (!API_URL) return false;
    set({ checking: true });
    try {
      const res = await fetch(`${API_URL}/me`, { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as { user?: User; guest?: GuestSession };
      if (res.ok) {
        if (data.user) {
          set({ user: data.user, guest: null, checking: false });
          return true;
        }
        if (data.guest) {
          set({ user: null, guest: data.guest, checking: false });
          return true;
        }
      }
      set({ user: null, guest: null, checking: false });
      return false;
    } catch {
      set({ user: null, guest: null, checking: false });
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
    set({ user: null, guest: null });
  },
}));
