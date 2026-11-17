import { Title } from "@solidjs/meta";
import { createSignal, For, onMount, Show } from "solid-js";
import Header from "~/components/Header";
import { changelog } from "~/lib/changelog";

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

function InlineText(props: { text: string }) {
  return (
    <For each={parseInline(props.text)}>
      {(segment) => (
        <Show
          when={segment.code}
          fallback={
            <Show when={segment.strong} fallback={segment.text}>
              <strong>{segment.text}</strong>
            </Show>
          }
        >
          <code>{segment.text}</code>
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

  return (
    <div class="home-page changelog-page">
      <Title>Changelog - bbdsmlr</Title>
      <Header info="Changelog" />
      <main>
        <section class="changelog-hero">
          <h2>What's new</h2>
          <p class="changelog-lede">
            Everything that shipped, newest first, grouped by the day it went
            live.
          </p>
        </section>

        <div class="changelog-days">
          <For each={changelog}>
            {(day, index) => (
              <article
                class="changelog-day"
                classList={{
                  "changelog-day-latest": index() === 0,
                  "changelog-day-earlier": !!day.note,
                }}
              >
                <div class="changelog-day-head">
                  <h3 class="changelog-day-date">
                    <time dateTime={day.date}>
                      {dayLabel(day.date, today())}
                    </time>
                  </h3>
                  <span class="changelog-day-count">
                    {day.changes.length}{" "}
                    {day.changes.length === 1 ? "change" : "changes"}
                  </span>
                </div>
                <Show when={day.note}>
                  <p class="changelog-day-note">{day.note}</p>
                </Show>

                <ul class="changelog-items">
                  <For each={day.changes}>
                    {(change) => (
                      <li class="changelog-item">
                        <span class="changelog-item-head">
                          <span
                            class={`changelog-kind changelog-kind-${change.kind.toLowerCase()}`}
                          >
                            {change.kind}
                          </span>
                          <span class="changelog-item-title">
                            <InlineText text={change.title} />
                          </span>
                        </span>
                        <span class="changelog-item-body">
                          <InlineText text={change.body} />
                        </span>
                      </li>
                    )}
                  </For>
                </ul>
              </article>
            )}
          </For>
        </div>
      </main>
    </div>
  );
}
