import type { ChangelogEntry, ChangelogKind } from "~/lib/changelog";

/** Where the notification sends people to read the full changelog. */
export const CHANGELOG_PAGE_URL = "https://bdsmlr.zastraea.xyz/changelog";

const APP_ICON_URL = "https://bdsmlr.zastraea.xyz/icons/icon-192.png";

const KIND_COLORS: Record<ChangelogKind, number> = {
  Added: 0x22c55e,
  Improved: 0x3b82f6,
  Fixed: 0xf59e0b,
  Removed: 0xef4444,
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** One changelog entry with the day group it belongs to. */
export interface ChangelogNoticeEntry {
  date: string;
  entry: ChangelogEntry;
}

export interface DiscordEmbed {
  title: string;
  description: string;
  url: string;
  color: number;
  footer: { text: string };
}

export interface DiscordMessage {
  username: string;
  avatar_url: string;
  content?: string;
  embeds: DiscordEmbed[];
}

/** Discord accepts at most 10 embeds in one webhook message. */
const MAX_EMBEDS = 10;

export function formatChangelogDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const monthName = MONTHS[month - 1] ?? "";
  return `${day} ${monthName} ${year}`;
}

/**
 * Turn changelog entries into Discord webhook messages: one embed per entry,
 * newest first, split into messages of ten so each post stays within Discord's
 * limits.
 */
export function buildChangelogMessages(
  entries: ChangelogNoticeEntry[],
): DiscordMessage[] {
  if (entries.length === 0) return [];

  const messages: DiscordMessage[] = [];
  for (let start = 0; start < entries.length; start += MAX_EMBEDS) {
    const chunk = entries.slice(start, start + MAX_EMBEDS);
    const message: DiscordMessage = {
      username: "bbdsmlr",
      avatar_url: APP_ICON_URL,
      embeds: chunk.map(({ date, entry }) => ({
        title: `${entry.kind} · ${entry.title}`,
        description: entry.body,
        url: CHANGELOG_PAGE_URL,
        color: KIND_COLORS[entry.kind],
        footer: { text: formatChangelogDay(date) },
      })),
    };
    if (start === 0) {
      message.content = `**bbdsmlr update** · [Changelog](${CHANGELOG_PAGE_URL})`;
    }
    messages.push(message);
  }

  return messages;
}
