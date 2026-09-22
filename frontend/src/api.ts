// Simple typed API client for Mana Ooru
const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

export type Location = {
  id: string;
  name_en: string;
  name_te: string;
  district_en: string;
  district_te: string;
  state_en: string;
  state_te: string;
  lat: number;
  lng: number;
};

export type Business = {
  id: string;
  location_id: string;
  category: string;
  section: string;
  name_en: string;
  name_te: string;
  subtitle_en?: string | null;
  subtitle_te?: string | null;
  phone?: string | null;
  address_en?: string | null;
  address_te?: string | null;
  distance_km?: number | null;
  open_now: boolean;
  hours_en?: string | null;
  hours_te?: string | null;
  verified?: boolean;
  photos?: string[];
};

export type EmergencyContact = {
  id: string;
  slug: string;
  label_en: string;
  label_te: string;
  number: string;
};

export type UpdateItem = {
  id: string;
  location_id: string;
  title_en: string;
  title_te: string;
  body_en: string;
  body_te: string;
  posted_at: string;
  tag_en?: string | null;
  tag_te?: string | null;
};

export type SearchResult = {
  intent: { section?: string | null; keywords?: string; confidence?: number };
  businesses: Business[];
};

export type Bus = { time: string; eta_min: number; to_en: string; to_te: string; route: string };
export type BusesResp = { location_id: string; buses: Bus[]; now_ist?: string };

export type Post = {
  id: string;
  location_id: string;
  user_id: string;
  author_name?: string | null;
  author_picture?: string | null;
  title: string;
  body: string;
  image_path?: string | null;
  posted_at: string;
  reports: number;
  hidden: boolean;
  reactions?: { pray?: number; heart?: number; alert?: number };
};

export type ReactionKind = "pray" | "heart" | "alert";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  locations: () => req<Location[]>("/locations"),
  emergency: () => req<EmergencyContact[]>("/emergency"),
  businesses: (params: { location_id: string; section?: string; category?: string; q?: string }) => {
    const u = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && u.append(k, String(v)));
    return req<Business[]>(`/businesses?${u.toString()}`);
  },
  updates: (location_id: string) => req<UpdateItem[]>(`/updates?location_id=${encodeURIComponent(location_id)}`),
  search: (payload: { query: string; location_id: string; lang: string }) =>
    req<SearchResult>("/search", { method: "POST", body: JSON.stringify(payload) }),
  buses: (location_id: string) => req<BusesResp>(`/buses?location_id=${encodeURIComponent(location_id)}`),
  posts: (location_id: string) => req<Post[]>(`/posts?location_id=${encodeURIComponent(location_id)}`),
  reportPost: (id: string) => req<{ status: string }>(`/posts/${id}/report`, { method: "POST" }),
  reactPost: (id: string, kind: ReactionKind, device_id: string) =>
    req<{ reactions: { pray?: number; heart?: number; alert?: number } }>(`/posts/${id}/react`, {
      method: "POST",
      body: JSON.stringify({ kind, device_id }),
    }),
  myReaction: (id: string, device_id: string) =>
    req<{ kind: ReactionKind | null }>(`/posts/${id}/my-reaction?device_id=${encodeURIComponent(device_id)}`),
  fileUrl: (path?: string | null) => (path ? `${BASE}/api/files/${path}` : undefined),
};
