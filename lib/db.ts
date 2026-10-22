"use client";

import { getSupabase } from "./supabase";

export type Role = "owner" | "walker";

export type Profile = {
  id: string;
  role: Role;
  name: string;
  phone: string | null;
  area: string | null;
  created_at: string;
};

export type Dog = {
  id: string;
  owner_id: string;
  name: string;
  breed: string | null;
  size: "small" | "medium" | "large" | null;
  notes: string | null;
  created_at: string;
};

export type WalkStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

export type Walk = {
  id: string;
  owner_id: string;
  dog_id: string;
  walker_id: string | null;
  area: string;
  address: string;
  duration_min: number;
  price_aed: number;
  status: WalkStatus;
  photo_count: number;
  created_at: string;
  accepted_at: string | null;
  started_at: string | null;
  ended_at: string | null;
};

// Shape returned when we join dog/owner/walker names onto a walk
export type WalkWithRefs = Walk & {
  dog_name?: string;
  dog_breed?: string;
  owner_name?: string;
  walker_name?: string;
};

export type WalkerProfile = {
  id: string;
  bio: string | null;
  years_experience: number | null;
  languages: string[] | null;
  areas_served: string[] | null;
  photo_url: string | null;
  hourly_rate_aed: number | null;
  id_verified: boolean;
  rating_avg: number | null;
  rating_count: number;
  updated_at: string;
};

export const DUBAI_AREAS = [
  "Dubai Marina",
  "JBR",
  "JVC",
  "JVT",
  "Downtown",
  "Business Bay",
  "Al Barsha",
  "The Springs",
  "The Meadows",
  "Arabian Ranches",
  "Motor City",
  "Mirdif",
];

export const LANGUAGES = [
  "English",
  "Arabic",
  "Hindi",
  "Urdu",
  "Tagalog",
  "Russian",
  "French",
  "Spanish",
];

export function priceFor(durationMin: number): number {
  if (durationMin <= 30) return 70;
  return 70 + (durationMin - 30);
}

// ---------------- Auth ----------------

export async function sendOtp(phone: string) {
  const sb = getSupabase();
  const { error } = await sb.auth.signInWithOtp({ phone });
  if (error) throw error;
}

export async function verifyOtp(phone: string, token: string) {
  const sb = getSupabase();
  const { data, error } = await sb.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const sb = getSupabase();
  await sb.auth.signOut();
}

export async function currentUserId(): Promise<string | null> {
  const sb = getSupabase();
  const { data } = await sb.auth.getUser();
  return data.user?.id || null;
}

// ---------------- Profile ----------------

export async function getProfile(id: string): Promise<Profile | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function getMyProfile(): Promise<Profile | null> {
  const id = await currentUserId();
  if (!id) return null;
  return getProfile(id);
}

export async function createProfile(input: {
  id: string;
  role: Role;
  name: string;
  phone?: string | null;
  area?: string | null;
}): Promise<Profile> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("profiles")
    .insert({
      id: input.id,
      role: input.role,
      name: input.name,
      phone: input.phone ?? null,
      area: input.area ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  // If a walker, also create empty walker_profile
  if (input.role === "walker") {
    await sb.from("walker_profiles").insert({ id: input.id }).select();
  }
  return data as Profile;
}

export async function updateMyProfile(patch: Partial<Omit<Profile, "id" | "role" | "created_at">>) {
  const id = await currentUserId();
  if (!id) throw new Error("Not signed in");
  const sb = getSupabase();
  const { error } = await sb.from("profiles").update(patch).eq("id", id);
  if (error) throw error;
}

// ---------------- Dogs ----------------

export async function getMyDogs(): Promise<Dog[]> {
  const id = await currentUserId();
  if (!id) return [];
  const sb = getSupabase();
  const { data, error } = await sb
    .from("dogs")
    .select("*")
    .eq("owner_id", id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Dog[]) || [];
}

export async function addDog(d: {
  name: string;
  breed?: string;
  size?: "small" | "medium" | "large";
  notes?: string;
}): Promise<Dog> {
  const id = await currentUserId();
  if (!id) throw new Error("Not signed in");
  const sb = getSupabase();
  const { data, error } = await sb
    .from("dogs")
    .insert({
      owner_id: id,
      name: d.name,
      breed: d.breed ?? null,
      size: d.size ?? null,
      notes: d.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Dog;
}

// ---------------- Walks ----------------

async function enrichWalks(walks: Walk[]): Promise<WalkWithRefs[]> {
  if (walks.length === 0) return [];
  const sb = getSupabase();
  const dogIds = Array.from(new Set(walks.map((w) => w.dog_id)));
  const profileIds = Array.from(
    new Set(walks.flatMap((w) => [w.owner_id, w.walker_id].filter(Boolean))),
  ) as string[];

  const [dogsRes, profRes] = await Promise.all([
    sb.from("dogs").select("id, name, breed").in("id", dogIds),
    sb.from("profiles").select("id, name").in("id", profileIds),
  ]);

  const dogMap = new Map<string, { name: string; breed: string | null }>();
  (dogsRes.data || []).forEach((d: any) =>
    dogMap.set(d.id, { name: d.name, breed: d.breed }),
  );
  const profMap = new Map<string, string>();
  (profRes.data || []).forEach((p: any) => profMap.set(p.id, p.name));

  return walks.map((w) => ({
    ...w,
    dog_name: dogMap.get(w.dog_id)?.name,
    dog_breed: dogMap.get(w.dog_id)?.breed || undefined,
    owner_name: profMap.get(w.owner_id),
    walker_name: w.walker_id ? profMap.get(w.walker_id) : undefined,
  }));
}

export async function getMyOwnerWalks(): Promise<WalkWithRefs[]> {
  const id = await currentUserId();
  if (!id) return [];
  const sb = getSupabase();
  const { data, error } = await sb
    .from("walks")
    .select("*")
    .eq("owner_id", id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return enrichWalks((data as Walk[]) || []);
}

export async function getOpenWalks(area?: string): Promise<WalkWithRefs[]> {
  const sb = getSupabase();
  let q = sb.from("walks").select("*").eq("status", "pending");
  if (area) q = q.eq("area", area);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return enrichWalks((data as Walk[]) || []);
}

export async function getActiveWalkForMe(): Promise<WalkWithRefs | null> {
  const id = await currentUserId();
  if (!id) return null;
  const sb = getSupabase();
  const { data, error } = await sb
    .from("walks")
    .select("*")
    .eq("walker_id", id)
    .in("status", ["accepted", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  const rows = (data as Walk[]) || [];
  if (rows.length === 0) return null;
  const [enriched] = await enrichWalks(rows);
  return enriched;
}

export async function getMyWalkerCompleted(): Promise<WalkWithRefs[]> {
  const id = await currentUserId();
  if (!id) return [];
  const sb = getSupabase();
  const { data, error } = await sb
    .from("walks")
    .select("*")
    .eq("walker_id", id)
    .eq("status", "completed")
    .order("ended_at", { ascending: false });
  if (error) throw error;
  return enrichWalks((data as Walk[]) || []);
}

export async function getWalk(id: string): Promise<WalkWithRefs | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("walks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [enriched] = await enrichWalks([data as Walk]);
  return enriched;
}

export async function createWalk(input: {
  dog_id: string;
  area: string;
  address: string;
  duration_min: number;
  price_aed: number;
}): Promise<Walk> {
  const id = await currentUserId();
  if (!id) throw new Error("Not signed in");
  const sb = getSupabase();
  const { data, error } = await sb
    .from("walks")
    .insert({
      owner_id: id,
      dog_id: input.dog_id,
      area: input.area,
      address: input.address,
      duration_min: input.duration_min,
      price_aed: input.price_aed,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Walk;
}

export async function updateWalk(id: string, patch: Partial<Walk>) {
  const sb = getSupabase();
  const { error } = await sb.from("walks").update(patch).eq("id", id);
  if (error) throw error;
}

export async function acceptWalk(walkId: string) {
  const id = await currentUserId();
  if (!id) throw new Error("Not signed in");
  await updateWalk(walkId, {
    status: "accepted",
    walker_id: id,
    accepted_at: new Date().toISOString(),
  });
}

export async function startWalk(walkId: string) {
  await updateWalk(walkId, {
    status: "in_progress",
    started_at: new Date().toISOString(),
  });
}

export async function endWalk(walkId: string) {
  await updateWalk(walkId, {
    status: "completed",
    ended_at: new Date().toISOString(),
  });
}

export async function cancelWalk(walkId: string) {
  await updateWalk(walkId, { status: "cancelled" });
}

// ---------------- Walk GPS locations ----------------

export type WalkLocation = {
  id: number;
  walk_id: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  recorded_at: string;
};

export async function pushLocation(input: {
  walk_id: string;
  lat: number;
  lng: number;
  accuracy_m?: number;
}) {
  const sb = getSupabase();
  const { error } = await sb.from("walk_locations").insert({
    walk_id: input.walk_id,
    lat: input.lat,
    lng: input.lng,
    accuracy_m: input.accuracy_m ?? null,
  });
  if (error) throw error;
}

export async function getWalkLocations(walkId: string): Promise<WalkLocation[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("walk_locations")
    .select("*")
    .eq("walk_id", walkId)
    .order("recorded_at", { ascending: true });
  if (error) throw error;
  return (data as WalkLocation[]) || [];
}

/**
 * Subscribe to realtime inserts on walk_locations for a specific walk.
 * Returns an unsubscribe function.
 */
export function subscribeToWalkLocations(
  walkId: string,
  onInsert: (loc: WalkLocation) => void,
): () => void {
  const sb = getSupabase();
  const channel = sb
    .channel(`walk_loc:${walkId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "walk_locations",
        filter: `walk_id=eq.${walkId}`,
      },
      (payload) => {
        onInsert(payload.new as WalkLocation);
      },
    )
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}

/**
 * Subscribe to realtime changes on a specific walk row.
 * Fires whenever status, photo_count etc change.
 */
export function subscribeToWalk(
  walkId: string,
  onChange: (walk: Walk) => void,
): () => void {
  const sb = getSupabase();
  const channel = sb
    .channel(`walk:${walkId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "walks",
        filter: `id=eq.${walkId}`,
      },
      (payload) => {
        onChange(payload.new as Walk);
      },
    )
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}

export async function bumpPhoto(walkId: string) {
  const sb = getSupabase();
  const { data: current, error: e1 } = await sb
    .from("walks")
    .select("photo_count")
    .eq("id", walkId)
    .single();
  if (e1) throw e1;
  const next = (current?.photo_count || 0) + 1;
  const { error } = await sb
    .from("walks")
    .update({ photo_count: next })
    .eq("id", walkId);
  if (error) throw error;
}

// ---------------- Walker profile ----------------

export async function getWalkerProfile(id: string): Promise<WalkerProfile | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("walker_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as WalkerProfile | null) || null;
}

export async function getMyWalkerProfile(): Promise<WalkerProfile | null> {
  const id = await currentUserId();
  if (!id) return null;
  return getWalkerProfile(id);
}

export async function upsertMyWalkerProfile(patch: Partial<WalkerProfile>) {
  const id = await currentUserId();
  if (!id) throw new Error("Not signed in");
  const sb = getSupabase();
  const { error } = await sb
    .from("walker_profiles")
    .upsert({ id, ...patch, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function uploadWalkerPhoto(file: File): Promise<string> {
  const id = await currentUserId();
  if (!id) throw new Error("Not signed in");
  const sb = getSupabase();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${id}/avatar-${Date.now()}.${ext}`;
  const { error } = await sb.storage
    .from("walker-photos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = sb.storage.from("walker-photos").getPublicUrl(path);
  return data.publicUrl;
}

// ---------------- Reviews ----------------

export type Review = {
  id: string;
  walk_id: string;
  owner_id: string;
  walker_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export async function getReviewsForWalker(walkerId: string): Promise<Review[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("reviews")
    .select("*")
    .eq("walker_id", walkerId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data as Review[]) || [];
}

export async function getReviewForWalk(walkId: string): Promise<Review | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("reviews")
    .select("*")
    .eq("walk_id", walkId)
    .maybeSingle();
  if (error) throw error;
  return (data as Review | null) || null;
}

export async function createReview(input: {
  walk_id: string;
  walker_id: string;
  rating: number;
  comment?: string;
}) {
  const id = await currentUserId();
  if (!id) throw new Error("Not signed in");
  const sb = getSupabase();
  const { error } = await sb.from("reviews").insert({
    walk_id: input.walk_id,
    owner_id: id,
    walker_id: input.walker_id,
    rating: input.rating,
    comment: input.comment || null,
  });
  if (error) throw error;
}
