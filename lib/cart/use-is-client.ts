"use client";

import { useSyncExternalStore } from "react";

// False during SSR and hydration, true afterwards. Use before rendering localStorage-backed state.
export function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
