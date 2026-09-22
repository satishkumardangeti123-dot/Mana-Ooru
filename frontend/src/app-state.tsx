import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import React from "react";

const ONBOARDED = "@manaooru:onboarded";
const LOCATION = "@manaooru:location";
const INTERESTS = "@manaooru:interests";

export const DEFAULT_LOCATION = "patavala";

type Ctx = {
  onboarded: boolean;
  locationId: string;
  interests: string[];
  ready: boolean;
  setOnboarded: (v: boolean) => void;
  setLocationId: (id: string) => void;
  setInterests: (ids: string[]) => void;
};

const AppStateContext = createContext<Ctx>({
  onboarded: false,
  locationId: DEFAULT_LOCATION,
  interests: [],
  ready: false,
  setOnboarded: () => {},
  setLocationId: () => {},
  setInterests: () => {},
});

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [onboarded, setOnboardedState] = useState(false);
  const [locationId, setLocIdState] = useState(DEFAULT_LOCATION);
  const [interests, setInterestsState] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [ob, loc, ints] = await Promise.all([
          AsyncStorage.getItem(ONBOARDED),
          AsyncStorage.getItem(LOCATION),
          AsyncStorage.getItem(INTERESTS),
        ]);
        setOnboardedState(ob === "1");
        if (loc) setLocIdState(loc);
        if (ints) {
          try { setInterestsState(JSON.parse(ints)); } catch {}
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setOnboarded = useCallback((v: boolean) => {
    setOnboardedState(v);
    AsyncStorage.setItem(ONBOARDED, v ? "1" : "0").catch(() => {});
  }, []);
  const setLocationId = useCallback((id: string) => {
    setLocIdState(id);
    AsyncStorage.setItem(LOCATION, id).catch(() => {});
  }, []);
  const setInterests = useCallback((ids: string[]) => {
    setInterestsState(ids);
    AsyncStorage.setItem(INTERESTS, JSON.stringify(ids)).catch(() => {});
  }, []);

  const value = useMemo<Ctx>(
    () => ({ onboarded, locationId, interests, ready, setOnboarded, setLocationId, setInterests }),
    [onboarded, locationId, interests, ready, setOnboarded, setLocationId, setInterests],
  );
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  return useContext(AppStateContext);
}
