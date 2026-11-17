import { describe, expect, it } from "vitest";
import { changelog } from "./changelog";

const KINDS = new Set(["New", "Improved", "Fixed", "Removed"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

describe("changelog", () => {
  it("is grouped by real days, newest first", () => {
    const dates = changelog.map((day) => day.date);
    for (const date of dates) {
      expect(date).toMatch(DATE_PATTERN);
      expect(Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())).toBe(false);
    }
    expect(new Set(dates).size).toBe(dates.length);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("has at least one entry per day", () => {
    for (const day of changelog) {
      expect(day.changes.length).toBeGreaterThan(0);
    }
  });

  it("has readable entries", () => {
    for (const day of changelog) {
      for (const change of day.changes) {
        expect(KINDS.has(change.kind)).toBe(true);
        expect(change.title.trim().length).toBeGreaterThan(0);
        expect(change.body.trim().length).toBeGreaterThan(0);
        expect(change.title).not.toContain("\n");
        expect(change.body).not.toContain("\n");
      }
    }
  });
});
