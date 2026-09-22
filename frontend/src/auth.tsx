// Auth context — Emergent-managed Google login (optional)
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

// Complete auth session on web
WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = "manaooru_session_token";
const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    try { return typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null; } catch { return null; }
  }
  return SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
}
async function setStoredToken(t: string | null) {
  if (Platform.OS === "web") {
    try {
      if (t) window.localStorage.setItem(TOKEN_KEY, t);
      else window.localStorage.removeItem(TOKEN_KEY);
    } catch {}
    return;
  }
  if (t) await SecureStore.setItemAsync(TOKEN_KEY, t).catch(() => {});
  else await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
}

export type User = { user_id: string; email: string; name?: string; picture?: string | null; role?: string };

type Ctx = {
  user: User | null;
  loading: boolean;
  token: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<Ctx>({
  user: null,
  loading: true,
  token: null,
  signIn: async () => {},
  signOut: async () => {},
  authFetch: async () => new Response(null, { status: 401 }),
});

const processed = new Set<string>();

async function exchange(session_id: string): Promise<{ session_token: string; user: User }> {
  const r = await fetch(`${BASE}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id }),
  });
  if (!r.ok) throw new Error(`session exchange ${r.status}`);
  return r.json();
}

function extractSessionId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/[?#&]session_id=([^&#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback(async (sessionId: string) => {
    if (processed.has(sessionId)) return;
    processed.add(sessionId);
    try {
      const res = await exchange(sessionId);
      await setStoredToken(res.session_token);
      setToken(res.session_token);
      setUser(res.user);
    } catch (e) {
      console.warn("auth exchange failed", e);
    }
  }, []);

  // Load stored session on mount + web hash handling
  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === "web" && typeof window !== "undefined") {
          const sid = extractSessionId(window.location.hash) || extractSessionId(window.location.search);
          if (sid) {
            await applySession(sid);
            // clean the URL
            const params = new URLSearchParams(window.location.search);
            params.delete("session_id");
            const newSearch = params.toString();
            const cleanHash = (window.location.hash || "").replace(/[?#&]?session_id=[^&#]+/, "");
            window.history.replaceState(window.history.state, "", window.location.pathname + (newSearch ? `?${newSearch}` : "") + cleanHash);
          }
        }
      } catch {}

      const t = await getStoredToken();
      if (t) {
        try {
          const me = await fetch(`${BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${t}` } });
          if (me.ok) {
            setToken(t);
            setUser(await me.json());
          } else if (me.status === 401) {
            await setStoredToken(null);
          }
        } catch {}
      }
      setLoading(false);
    })();
  }, [applySession]);

  // Mobile deep-link listener
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Linking.addEventListener("url", ({ url }) => {
      const sid = extractSessionId(url);
      if (sid) applySession(sid);
    });
    Linking.getInitialURL().then((u) => {
      const sid = extractSessionId(u);
      if (sid) applySession(sid);
    }).catch(() => {});
    return () => sub.remove();
  }, [applySession]);

  const signIn = useCallback(async () => {
    const redirectUrl =
      Platform.OS === "web" && typeof window !== "undefined"
        ? window.location.origin + "/"
        : Linking.createURL("");
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.location.href = authUrl;
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    const sid = extractSessionId((result as any).url) || extractSessionId(await Linking.getInitialURL());
    if (sid) await applySession(sid);
  }, [applySession]);

  const signOut = useCallback(async () => {
    try {
      if (token) await fetch(`${BASE}/api/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    } catch {}
    await setStoredToken(null);
    setToken(null);
    setUser(null);
  }, [token]);

  const authFetch = useCallback(async (path: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (!headers.has("Content-Type") && init?.body) headers.set("Content-Type", "application/json");
    return fetch(`${BASE}${path}`, { ...init, headers });
  }, [token]);

  const value = useMemo<Ctx>(() => ({ user, loading, token, signIn, signOut, authFetch }), [user, loading, token, signIn, signOut, authFetch]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
