// Mock store using localStorage. Swap this for Supabase/Firebase later.
// Everything is client-side so there's no backend to run yet.

export type Role = "owner" | "walker";

export type User = {
  id: string;
  name: string;
  phone: string;
  role: Role;
  area?: string;
};

export type Dog = {
  id: string;
  ownerId: string;
  name: string;
  breed: string;
  size: "small" | "medium" | "large";
  notes?: string;
};

export type WalkStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

export type WalkRequest = {
  id: string;
  ownerId: string;
  ownerName: string;
  dogId: string;
  dogName: string;
  dogBreed: string;
  area: string;
  address: string;
  durationMin: number;
  priceAed: number;
  createdAt: number;
  status: WalkStatus;
  walkerId?: string;
  walkerName?: string;
  acceptedAt?: number;
  startedAt?: number;
  endedAt?: number;
  photoCount?: number;
};

const K = {
  user: "ww:user",
  dogs: "ww:dogs",
  walks: "ww:walks",
};

const isBrowser = () => typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ---- User ----
export function getUser(): User | null {
  return read<User | null>(K.user, null);
}

export function setUser(u: User | null) {
  if (u === null) {
    if (isBrowser()) localStorage.removeItem(K.user);
    return;
  }
  write(K.user, u);
}

export function signUp(input: Omit<User, "id">): User {
  const u: User = { ...input, id: uid() };
  setUser(u);
  return u;
}

export function signOut() {
  setUser(null);
}

// ---- Dogs ----
export function getDogs(ownerId: string): Dog[] {
  return read<Dog[]>(K.dogs, []).filter((d) => d.ownerId === ownerId);
}

export function addDog(d: Omit<Dog, "id">): Dog {
  const all = read<Dog[]>(K.dogs, []);
  const dog: Dog = { ...d, id: uid() };
  all.push(dog);
  write(K.dogs, all);
  return dog;
}

// ---- Walks ----
export function getAllWalks(): WalkRequest[] {
  return read<WalkRequest[]>(K.walks, []);
}

export function getWalksForOwner(ownerId: string): WalkRequest[] {
  return getAllWalks()
    .filter((w) => w.ownerId === ownerId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getOpenWalks(area?: string): WalkRequest[] {
  return getAllWalks()
    .filter((w) => w.status === "pending" && (!area || w.area === area))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getActiveWalkForWalker(walkerId: string): WalkRequest | null {
  return (
    getAllWalks().find(
      (w) =>
        w.walkerId === walkerId &&
        (w.status === "accepted" || w.status === "in_progress"),
    ) || null
  );
}

export function getWalk(id: string): WalkRequest | null {
  return getAllWalks().find((w) => w.id === id) || null;
}

export function createWalk(
  input: Omit<
    WalkRequest,
    "id" | "createdAt" | "status" | "walkerId" | "walkerName"
  >,
): WalkRequest {
  const all = getAllWalks();
  const w: WalkRequest = {
    ...input,
    id: uid(),
    createdAt: Date.now(),
    status: "pending",
  };
  all.push(w);
  write(K.walks, all);
  return w;
}

export function updateWalk(id: string, patch: Partial<WalkRequest>) {
  const all = getAllWalks();
  const i = all.findIndex((w) => w.id === id);
  if (i === -1) return;
  all[i] = { ...all[i], ...patch };
  write(K.walks, all);
}

export function acceptWalk(id: string, walker: User) {
  updateWalk(id, {
    status: "accepted",
    walkerId: walker.id,
    walkerName: walker.name,
    acceptedAt: Date.now(),
  });
}

export function startWalk(id: string) {
  updateWalk(id, { status: "in_progress", startedAt: Date.now() });
}

export function endWalk(id: string) {
  updateWalk(id, { status: "completed", endedAt: Date.now() });
}

export function addPhoto(id: string) {
  const w = getWalk(id);
  if (!w) return;
  updateWalk(id, { photoCount: (w.photoCount || 0) + 1 });
}

// ---- Pricing helper ----
export function priceFor(durationMin: number): number {
  // Base 70 AED for 30 min, +1 AED per extra minute
  if (durationMin <= 30) return 70;
  return 70 + (durationMin - 30);
}

// ---- Dubai areas ----
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
