"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AppData } from "./types";
import { buildSeed } from "./seed";

const STORAGE_KEY = "duofit-v1";

interface Store {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  reset: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);

  useEffect(() => {
    let initial: AppData | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) initial = JSON.parse(raw) as AppData;
    } catch {
      /* corrupted → reseed */
    }
    setData(initial ?? buildSeed());
  }, []);

  useEffect(() => {
    if (data) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const update = useCallback((fn: (d: AppData) => AppData) => {
    setData((d) => (d ? fn(d) : d));
  }, []);

  const reset = useCallback(() => setData(buildSeed()), []);

  const value = useMemo(() => (data ? { data, update, reset } : null), [data, update, reset]);

  if (!value) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="font-serif text-2xl text-cream">
          DuoFit<span className="text-accent">.</span>
        </span>
      </div>
    );
  }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore outside StoreProvider");
  return ctx;
}
