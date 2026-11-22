import { Title } from "@solidjs/meta";
import { createSignal, For, onMount, Show } from "solid-js";
import { Page, PageHeader } from "~/components/Page";
import { changelog, entryId, type ChangelogKind } from "~/lib/changelog";
import {
  isChangelogEntryNew,
  markChangelogSeen,
  refreshChangelogSeen,
} from "~/lib/changelogSeen";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";

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

type InlineSegment = { text: string; code: boolean; strong: boolean };

function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let cursor = 0;
  let match = pattern.exec(text);

  while (match !== null) {
    if (match.index > cursor) {
      segments.push({
        text: text.slice(cursor, match.index),
        code: false,
        strong: false,
      });
    }
    const token = match[0];
    if (token.startsWith("**")) {
      segments.push({ text: token.slice(2, -2), code: false, strong: true });
    } else {
      segments.push({ text: token.slice(1, -1), code: true, strong: false });
    }
    cursor = match.index + token.length;
    match = pattern.exec(text);
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), code: false, strong: false });
  }

  return segments;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const monthName = MONTHS[month - 1] ?? "";
  return `${day} ${monthName} ${year}`;
}

/** Day shown above a group, with Today and Yesterday for the recent ones. */
function dayLabel(value: string, today: Date | null): string {
  if (!today) return formatDate(value);
  const [year, month, day] = value.split("-").map(Number);
  const target = new Date(year, month - 1, day);
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const diff = Math.round(
    (startOfToday.getTime() - target.getTime()) / 86_400_000,
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return formatDate(value);
}

const KIND_CLASS: Record<ChangelogKind, string> = {
  Added: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  Improved: "border-primary/50 bg-primary/10 text-primary",
  Fixed: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  Removed: "border-destructive/50 bg-destructive/10 text-destructive",
};

function InlineText(props: { text: string }) {
  return (
    <For each={parseInline(props.text)}>
      {(segment) => (
        <Show
          when={segment.code}
          fallback={
            <Show when={segment.strong} fallback={segment.text}>
              <strong class="font-semibold text-foreground">
                {segment.text}
              </strong>
            </Show>
          }
        >
          <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
            {segment.text}
          </code>
        </Show>
      )}
    </For>
  );
}

export default function ChangelogPage() {
  // Only known on the client, so the server-rendered heading is always a date
  // and the relative label appears after hydration without a mismatch.
  const [today, setToday] = createSignal<Date | null>(null);
  onMount(() => setToday(new Date()));

  // Frozen for this visit, so the markers stay put while the counter clears.
  const [newIds, setNewIds] = createSignal<ReadonlySet<string>>(new Set());

  onMount(() => {
    refreshChangelogSeen();
    const fresh = new Set<string>();
    for (const day of changelog) {
      for (const change of day.changes) {
        const id = entryId(day.date, change);
        if (isChangelogEntryNew(id)) fresh.add(id);
      }
    }
    setNewIds(fresh);
    markChangelogSeen();
  });

  return (
    <Page info="Changelog" width="lg" class="max-w-3xl">
      <Title>Changelog - bbdsmlr</Title>
      <PageHeader
        title="What's new"
        description="Everything that shipped, newest first, grouped by the day it went live."
      />
      <Show when={newIds().size > 0}>
        <Badge
          variant="outline"
          class="mb-4 border-primary/50 bg-primary/10 text-primary"
        >
          {newIds().size} new since your last visit
        </Badge>
      </Show>

      <div class="flex flex-col gap-4">
        <For each={changelog}>
          {(day, index) => (
            <Card
              class="gap-4 p-4 sm:p-5"
              classList={{ "border-primary/45": index() === 0 }}
            >
              <div class="flex flex-wrap items-baseline justify-between gap-2.5">
                <h2 class="text-lg font-semibold text-card-foreground">
                  <time dateTime={day.date}>
                    {dayLabel(day.date, today())}
                  </time>
                </h2>
                <Badge
                  variant="outline"
                  class="font-normal text-muted-foreground"
                >
                  {day.changes.length}{" "}
                  {day.changes.length === 1 ? "change" : "changes"}
                </Badge>
              </div>
              <Show when={day.note}>
                <p class="-mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {day.note}
                </p>
              </Show>

              <ul class="flex flex-col gap-3.5">
                <For each={day.changes}>
                  {(change) => {
                    const id = entryId(day.date, change);
                    const isNew = () => newIds().has(id);
                    return (
                      <li
                        class="flex flex-col gap-1 border-l-2 pl-3"
                        classList={{
                          "border-primary": isNew(),
                          "border-transparent": !isNew(),
                        }}
                      >
                        <span class="flex flex-wrap items-center gap-2">
                          <Show when={isNew()}>
                            <Badge
                              variant="outline"
                              class="px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider border-primary/50 bg-primary/15 text-primary"
                            >
                              New
                            </Badge>
                          </Show>
                          <Badge
                            variant="outline"
                            class={`px-1.5 py-0 text-[11px] font-semibold uppercase tracking-wide ${KIND_CLASS[change.kind]}`}
                          >
                            {change.kind}
                          </Badge>
                          <span class="text-sm font-semibold text-card-foreground">
                            <InlineText text={change.title} />
                          </span>
                        </span>
                        <span class="text-sm leading-relaxed text-muted-foreground">
                          <InlineText text={change.body} />
                        </span>
                      </li>
                    );
                  }}
                </For>
              </ul>
            </Card>
          )}
        </For>
      </div>
    </Page>
  );
}
