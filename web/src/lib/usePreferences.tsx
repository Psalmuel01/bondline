"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAccount } from "wagmi";
import { CORE_ADDRESS } from "./contracts";
import { monadMainnet } from "./chain";
export type Preferences = {
  deadlines: boolean;
  evidence: boolean;
  activity: boolean;
  introSeen: boolean;
  readIds: string[];
};
export const defaultPreferences: Preferences = {
  deadlines: true,
  evidence: true,
  activity: true,
  introSeen: false,
  readIds: [],
};
export function parsePreferences(raw: unknown): Preferences {
  const value =
    raw && typeof raw === "object" ? (raw as Partial<Preferences>) : {};
  return {
    deadlines: typeof value.deadlines === "boolean" ? value.deadlines : true,
    evidence: typeof value.evidence === "boolean" ? value.evidence : true,
    activity: typeof value.activity === "boolean" ? value.activity : true,
    introSeen: value.introSeen === true,
    readIds: Array.isArray(value.readIds)
      ? value.readIds
          .filter(
            (id): id is string => typeof id === "string" && id.length <= 200,
          )
          .slice(-500)
      : [],
  };
}
export function preferencesKey(address?: string) {
  return `bondline.preferences.v1:${monadMainnet.id}:${CORE_ADDRESS.toLowerCase()}:${address?.toLowerCase() || "guest"}`;
}
type State = {
  preferences: Preferences;
  ready: boolean;
  error: string;
  update: (patch: Partial<Preferences>) => void;
  reset: () => void;
  markRead: (ids: string[]) => void;
};
const Context = createContext<State | undefined>(undefined);
export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { address } = useAccount();
  const key = preferencesKey(address);
  const [stored, setStored] = useState<{ key: string; value: Preferences }>();
  const [error, setError] = useState("");
  useEffect(() => {
    let value = defaultPreferences;
    try {
      value = parsePreferences(JSON.parse(localStorage.getItem(key) || "null"));
      setError("");
    } catch {
      setError(
        "Device preferences could not be restored. Defaults are being used.",
      );
    }
    setStored({ key, value });
  }, [key]);
  const update = useCallback(
    (patch: Partial<Preferences>) => {
      const value = parsePreferences({
        ...(stored?.key === key ? stored.value : defaultPreferences),
        ...patch,
      });
      try {
        localStorage.setItem(key, JSON.stringify(value));
        setError("");
      } catch {
        setError(
          "Your browser cannot save preferences. This change applies to this session only.",
        );
      }
      setStored({ key, value });
    },
    [key, stored],
  );
  const value = stored?.key === key ? stored.value : defaultPreferences;
  const markRead = (ids: string[]) =>
    update({ readIds: [...new Set([...value.readIds, ...ids])].slice(-500) });
  return (
    <Context.Provider
      value={{
        preferences: value,
        ready: stored?.key === key,
        error,
        update,
        reset: () => update(defaultPreferences),
        markRead,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePreferences() {
  const value = useContext(Context);
  if (!value) throw new Error("PreferencesProvider is required.");
  return value;
}
