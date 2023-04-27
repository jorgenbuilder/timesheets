import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { endActiveTimer, getActiveTimer } from "../api/raw";
import { ActiveTimer } from "../models/timesheets";
import { initJuno } from "@junobuild/core";

interface Store {
  state: { idle: null } | { running: ActiveTimer };
  init: () => Promise<void>;
  end: () => Promise<void>;
}

export const useStore = create<Store>()(
  devtools((set, get) => ({
    state: { idle: null },

    async init() {
      await initJuno({
        satelliteId: "56vi6-hiaaa-aaaal-ab5la-cai",
      });
      const active = await getActiveTimer();
      if (active) {
        set({ state: { running: active } });
      }
    },

    async end() {
      const { state } = get();
      if ("idle" in state) return;
      await endActiveTimer();
      set({ state: { idle: null } });
    },
  }))
);
