"use client";

import { create } from "zustand";
import type { ApiUser } from "@/lib/api";

type AuthStore = {
  user: ApiUser | null;
  setUser: (user: ApiUser | null) => void;
};

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

export const canApprove = (user: ApiUser | null) => user?.role === "admin" || user?.role === "manager";
