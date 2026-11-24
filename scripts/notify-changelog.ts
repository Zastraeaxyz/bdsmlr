import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { changelog, changelogIds, entryId } from "../src/lib/changelog";
import {
  buildChangelogMessages,
  type ChangelogNoticeEntry,
  type DiscordMessage,
} from "../src/lib/changelogNotify";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_PATH = resolve(ROOT, ".discord-notified.json");
const WEBHOOK_ENV = "DISCORD_CHANGELOG_WEBHOOK";
const STATE_VERSION = 1;

interface NotifiedState {
  v: number;
  ids: string[];
}

function readState(): NotifiedState | null {
  if (!existsSync(STATE_PATH)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(STATE_PATH, "utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    const state = parsed as Partial<NotifiedState>;
    if (state.v !== STATE_VERSION) return null;
    if (!Array.isArray(state.ids)) return null;
    if (!state.ids.every((id) => typeof id === "string")) return null;
    return { v: STATE_VERSION, ids: state.ids };
  } catch {
    return null;
  }
}

function writeState(ids: string[]): void {
  const state: NotifiedState = { v: STATE_VERSION, ids };
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

/** Every changelog entry with its day, newest first. */
function allEntries(): ChangelogNoticeEntry[] {
  return changelog.flatMap((day) =>
    day.changes.map((entry) => ({ date: day.date, entry })),
  );
}

/**
 * Without state, announce the newest day once so setup posts something real.
 * Afterwards, announce only entries that were not posted yet.
 */
function pendingEntries(state: NotifiedState | null): ChangelogNoticeEntry[] {
  const entries = allEntries();
  if (!state) {
    const newest = changelog[0]?.date;
    return entries.filter((item) => item.date === newest);
  }
  const notified = new Set(state.ids);
  return entries.filter((item) => !notified.has(entryId(item.date, item.entry)));
}

function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms));
}

async function postMessage(
  webhook: string,
  message: DiscordMessage,
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(message),
    });
    if (response.ok) return;

    if (response.status === 429) {
      const payload = (await response.json().catch(() => null)) as {
        retry_after?: number;
      } | null;
      const seconds = Math.min(Number(payload?.retry_after) || 1, 30);
      await sleep(seconds * 1000);
      continue;
    }

    const body = await response.text().catch(() => "");
    const detail = body ? `: ${body.slice(0, 300)}` : "";
    throw new Error(`Discord webhook returned ${response.status}${detail}`);
  }
  throw new Error("Discord webhook kept rate limiting; gave up");
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const state = readState();
  const pending = pendingEntries(state);

  if (pending.length === 0) {
    console.log("No new changelog entries to announce.");
    return;
  }

  const messages = buildChangelogMessages(pending);

  if (dryRun) {
    console.log(
      `Dry run: ${pending.length} entries in ${messages.length} message(s).`,
    );
    for (const message of messages) {
      console.log(JSON.stringify(message, null, 2));
    }
    return;
  }

  const webhook = process.env[WEBHOOK_ENV];
  if (!webhook) {
    console.warn(`Skipping Discord update: ${WEBHOOK_ENV} is not set.`);
    return;
  }

  for (const message of messages) {
    await postMessage(webhook, message);
  }
  writeState(changelogIds());
  console.log(
    `Announced ${pending.length} changelog entr${pending.length === 1 ? "y" : "ies"} on Discord.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
