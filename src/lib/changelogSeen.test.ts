import { afterEach, describe, expect, it } from "vitest";
import { changelogFingerprint, changelogIds } from "~/lib/changelog";
import {
  CHANGELOG_SEEN_STORAGE_KEY,
  changelogUnseenCount,
  isChangelogEntryNew,
  markChangelogSeen,
  refreshChangelogSeen,
} from "~/lib/changelogSeen";

function useLocalStorage(initial?: string) {
  const store = new Map<string, string>();
  if (initial !== undefined) store.set(CHANGELOG_SEEN_STORAGE_KEY, initial);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    },
  });
  return store;
}

function storedState(store: Map<string, string>) {
  const raw = store.get(CHANGELOG_SEEN_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

/** A stored visit that knows every entry except the `skip` newest ones. */
function visitMissingNewest(count: number) {
  const ids = changelogIds();
  return {
    v: 1,
    visits: [
      {
        at: 1,
        fingerprint: "older",
        ids: ids.slice(count),
      },
    ],
  };
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "localStorage");
});

describe("changelog read state", () => {
  it("seeds a baseline on the first visit without announcing the changelog", () => {
    const store = useLocalStorage();

    refreshChangelogSeen();

    expect(changelogUnseenCount()).toBe(0);
    expect(isChangelogEntryNew(changelogIds()[0])).toBe(false);
    const state = storedState(store);
    expect(state.visits).toHaveLength(1);
    expect(state.visits[0].fingerprint).toBe(changelogFingerprint());
    expect(state.visits[0].ids).toEqual(changelogIds());
  });

  it("counts entries shipped after the stored visit", () => {
    const store = useLocalStorage(JSON.stringify(visitMissingNewest(3)));

    refreshChangelogSeen();

    const [first, second, third, fourth] = changelogIds();
    expect(changelogUnseenCount()).toBe(3);
    expect(isChangelogEntryNew(first)).toBe(true);
    expect(isChangelogEntryNew(second)).toBe(true);
    expect(isChangelogEntryNew(third)).toBe(true);
    expect(isChangelogEntryNew(fourth)).toBe(false);
    expect(storedState(store).visits).toHaveLength(1);
  });

  it("marks everything as read only when the changelog is opened", () => {
    useLocalStorage(JSON.stringify(visitMissingNewest(3)));
    refreshChangelogSeen();
    expect(changelogUnseenCount()).toBe(3);

    markChangelogSeen();

    expect(changelogUnseenCount()).toBe(0);
    expect(isChangelogEntryNew(changelogIds()[0])).toBe(false);
  });

  it("keeps one snapshot per changelog instead of stacking repeats", () => {
    const store = useLocalStorage();

    markChangelogSeen();
    markChangelogSeen();

    expect(storedState(store).visits).toHaveLength(1);
  });

  it("keeps a short history so older read ids are not lost", () => {
    const store = useLocalStorage(JSON.stringify(visitMissingNewest(2)));

    markChangelogSeen();

    const { visits } = storedState(store);
    expect(visits).toHaveLength(2);
    expect(visits[0].fingerprint).toBe(changelogFingerprint());
    expect(visits[1].fingerprint).toBe("older");
    expect(changelogUnseenCount()).toBe(0);
  });

  it("caps the stored history", () => {
    const visits = Array.from({ length: 8 }, (_, index) => ({
      at: index,
      fingerprint: `visit-${index}`,
      ids: changelogIds().slice(index),
    }));
    const store = useLocalStorage(JSON.stringify({ v: 1, visits }));

    markChangelogSeen();

    expect(storedState(store).visits).toHaveLength(5);
  });

  it("recovers from unreadable or outdated storage", () => {
    const store = useLocalStorage("not json");

    refreshChangelogSeen();

    expect(changelogUnseenCount()).toBe(0);
    expect(storedState(store).visits).toHaveLength(1);

    const outdated = useLocalStorage(JSON.stringify({ v: 0, visits: [] }));
    refreshChangelogSeen();

    expect(changelogUnseenCount()).toBe(0);
    expect(storedState(outdated).v).toBe(1);
  });

  it("does not throw when storage is unavailable", () => {
    expect(() => refreshChangelogSeen()).not.toThrow();
    expect(() => markChangelogSeen()).not.toThrow();
    expect(changelogUnseenCount()).toBe(0);
  });
});
