import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { createActiveTimer, endActiveTimer, getActiveTimer } from "../api";
import { ActiveTimer } from "../models/timesheets";

interface Store {
  state: { idle: null } | { running: ActiveTimer };
  init: () => Promise<void>;
  start: () => Promise<void>;
  end: () => Promise<void>;
}

export const useStore = create<Store>()(
  devtools((set, get) => ({
    state: { idle: null },

    async init() {
      const active = await getActiveTimer();
      if (active) {
        set({ state: { running: active } });
      }
    },

    async start() {
      const { state } = get();
      if ("running" in state) return;
      const timer = await createActiveTimer();
      set({ state: { running: timer } });
    },

    async end() {
      const { state } = get();
      if ("idle" in state) return;
      await endActiveTimer();
      set({ state: { idle: null } });
    },
  }))
);