import { createSignal } from "solid-js";
import { changelogFingerprint, changelogIds } from "./changelog";

export const CHANGELOG_SEEN_STORAGE_KEY = "bbdsmlr:changelogSeen";

/** Bumped when the stored shape changes. Older shapes are ignored. */
const STORAGE_VERSION = 1;

/**
 * How many past visits to remember. Read ids are the union of every stored
 * visit, so a stale tab opening the page cannot wipe ids a newer tab recorded,
 * and markers survive a few visits before the oldest snapshot drops off.
 */
const MAX_VISITS = 5;

interface ChangelogVisit {
  /** When the visit happened, in milliseconds since the epoch. */
  at: number;
  /** Fingerprint of the changelog at that visit. */
  fingerprint: string;
  /** Entry ids that existed, and so were read, at that visit. */
  ids: string[];
}

interface ChangelogSeenState {
  v: number;
  visits: ChangelogVisit[];
}

const [seenIds, setSeenIds] = createSignal<ReadonlySet<string>>(new Set());
const [unseenCount, setUnseenCount] = createSignal(0);

export { unseenCount as changelogUnseenCount };

function isVisit(value: unknown): value is ChangelogVisit {
  if (!value || typeof value !== "object") return false;
  const visit = value as Partial<ChangelogVisit>;
  return (
    typeof visit.at === "number" &&
    typeof visit.fingerprint === "string" &&
    Array.isArray(visit.ids) &&
    visit.ids.every((id) => typeof id === "string")
  );
}

function readState(): ChangelogSeenState | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(CHANGELOG_SEEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ChangelogSeenState>;
    if (!parsed || parsed.v !== STORAGE_VERSION) return null;
    if (!Array.isArray(parsed.visits)) return null;
    const visits = parsed.visits.filter(isVisit);
    if (visits.length === 0) return null;
    return { v: STORAGE_VERSION, visits };
  } catch {
    return null;
  }
}

function writeState(state: ChangelogSeenState): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(CHANGELOG_SEEN_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/** Ids in the stored visits that are still part of the changelog. */
function readIds(state: ChangelogSeenState | null): Set<string> {
  if (!state) return new Set();
  const current = new Set(changelogIds());
  const seen = new Set<string>();
  for (const visit of state.visits) {
    for (const id of visit.ids) {
      if (current.has(id)) seen.add(id);
    }
  }
  return seen;
}

/**
 * Load the stored read state and publish how many entries are new. Safe to
 * call more than once: it only reads, and the first call with no stored state
 * seeds a baseline so a first visit does not announce the whole changelog.
 */
export function refreshChangelogSeen(): void {
  const ids = changelogIds();
  const state = readState();
  if (!state) {
    writeState({
      v: STORAGE_VERSION,
      visits: [{ at: Date.now(), fingerprint: changelogFingerprint(), ids }],
    });
    setSeenIds(new Set(ids));
    setUnseenCount(0);
    return;
  }
  const seen = readIds(state);
  setSeenIds(seen);
  setUnseenCount(ids.filter((id) => !seen.has(id)).length);
}

/**
 * Record that the visitor has now seen everything in the changelog. Called
 * from the changelog page, never from the navigation, so the counter only
 * clears once the page is actually opened.
 */
export function markChangelogSeen(): void {
  const ids = changelogIds();
  const fingerprint = changelogFingerprint();
  const previous = readState();
  // Repeated visits to the same changelog collapse into one snapshot.
  const kept = (previous?.visits ?? []).filter(
    (visit) => visit.fingerprint !== fingerprint,
  );
  const visits = [
    { at: Date.now(), fingerprint, ids },
    ...kept,
  ].slice(0, MAX_VISITS);
  const state: ChangelogSeenState = { v: STORAGE_VERSION, visits };
  writeState(state);
  setSeenIds(readIds(state));
  setUnseenCount(0);
}

/** Whether this visitor has not read the entry yet. */
export function isChangelogEntryNew(id: string): boolean {
  return !seenIds().has(id);
}
