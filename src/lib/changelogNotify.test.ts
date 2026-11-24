import { describe, expect, it } from "vitest";
import type { ChangelogEntry, ChangelogKind } from "~/lib/changelog";
import {
  CHANGELOG_PAGE_URL,
  buildChangelogMessages,
  formatChangelogDay,
  type ChangelogNoticeEntry,
} from "~/lib/changelogNotify";

function entry(
  kind: ChangelogKind,
  title: string,
  body = `${title} body`,
): ChangelogEntry {
  return { kind, title, body };
}

function notice(
  date: string,
  item: ChangelogEntry,
): ChangelogNoticeEntry {
  return { date, entry: item };
}

describe("buildChangelogMessages", () => {
  it("returns nothing when there is nothing to announce", () => {
    expect(buildChangelogMessages([])).toEqual([]);
  });

  it("writes one embed per entry with kind, body, day, and changelog link", () => {
    const messages = buildChangelogMessages([
      notice("2026-11-23", entry("Improved", "Post links stay in the app")),
    ]);

    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe(
      `**bbdsmlr update** · [Changelog](${CHANGELOG_PAGE_URL})`,
    );
    expect(messages[0].embeds).toEqual([
      {
        title: "Improved · Post links stay in the app",
        description: "Post links stay in the app body",
        url: CHANGELOG_PAGE_URL,
        color: 0x3b82f6,
        footer: { text: "23 November 2026" },
      },
    ]);
  });

  it("gives each kind its own color", () => {
    const messages = buildChangelogMessages([
      notice("2026-11-23", entry("Added", "A")),
      notice("2026-11-23", entry("Improved", "B")),
      notice("2026-11-23", entry("Fixed", "C")),
      notice("2026-11-23", entry("Removed", "D")),
    ]);

    expect(messages[0].embeds.map((embed) => embed.color)).toEqual([
      0x22c55e, 0x3b82f6, 0xf59e0b, 0xef4444,
    ]);
  });

  it("keeps markdown code in titles and bodies intact", () => {
    const messages = buildChangelogMessages([
      notice(
        "2026-11-24",
        entry(
          "Improved",
          "Search sends `post_types`",
          "The request now includes `variants`.",
        ),
      ),
    ]);

    expect(messages[0].embeds[0].title).toBe(
      "Improved · Search sends `post_types`",
    );
    expect(messages[0].embeds[0].description).toBe(
      "The request now includes `variants`.",
    );
  });

  it("splits more than ten entries into several messages", () => {
    const entries = Array.from({ length: 12 }, (_, index) =>
      notice("2026-11-24", entry("Fixed", `Entry ${index + 1}`)),
    );
    const messages = buildChangelogMessages(entries);

    expect(messages).toHaveLength(2);
    expect(messages[0].embeds).toHaveLength(10);
    expect(messages[1].embeds).toHaveLength(2);
    expect(messages[0].content).toContain("bbdsmlr update");
    expect(messages[1].content).toBeUndefined();
  });

  it("formats day groups the way the changelog page does", () => {
    expect(formatChangelogDay("2026-11-23")).toBe("23 November 2026");
    expect(formatChangelogDay("2026-01-02")).toBe("2 January 2026");
  });
});
