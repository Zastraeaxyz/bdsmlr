import { createSignal } from "solid-js";

const STORAGE_KEY = "bdsmlr:activeBlogId";

function readStored(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? value : null;
}

const [activeBlogId, setActiveBlogIdSignal] = createSignal<number | null>(
  readStored(),
);

export { activeBlogId };

export function setActiveBlogId(id: number | null): void {
  setActiveBlogIdSignal(id);
  if (typeof window === "undefined") return;
  if (id && id > 0) localStorage.setItem(STORAGE_KEY, String(id));
  else localStorage.removeItem(STORAGE_KEY);
}

export function currentActorBlogId(): number | null {
  return activeBlogId() ?? readStored();
}

export function clearActiveBlogId(): void {
  setActiveBlogIdSignal(null);
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
}
