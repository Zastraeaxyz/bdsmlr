const HISTORY_LIMIT = 20;

export function loadSearchHistory(key: string): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function addSearchHistory(key: string, query: string): string[] {
  const q = query.trim();
  if (!q) return loadSearchHistory(key);
  const entries = [q, ...loadSearchHistory(key).filter((e) => e !== q)];
  const trimmed = entries.slice(0, HISTORY_LIMIT);
  saveSearchHistory(key, trimmed);
  return trimmed;
}

export function removeSearchHistory(key: string, query: string): string[] {
  const entries = loadSearchHistory(key).filter((e) => e !== query);
  saveSearchHistory(key, entries);
  return entries;
}

function saveSearchHistory(key: string, entries: string[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(entries));
  } catch {}
}
