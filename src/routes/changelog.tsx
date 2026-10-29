import { Title } from "@solidjs/meta";
import { For, Show } from "solid-js";
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

function versionLabel(version: string): string {
  return version === "Unreleased" ? "Unreleased" : `v${version}`;
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
  return (
    <div class="home-page changelog-page">
      <Title>Changelog - bbdsmlr</Title>
      <Header info="Changelog" />
      <main>
        <section class="changelog-hero">
          <h2>What's new</h2>
          <p class="changelog-lede">
            Every change you can see or use in Better BDSMLR, newest first.
            Entries describe what the app does now rather than how it is built.
          </p>
        </section>

        <div class="changelog-releases">
          <For each={changelog}>
            {(release, index) => (
              <article
                class="changelog-release"
                classList={{ "changelog-release-latest": index() === 0 }}
              >
                <div class="changelog-release-head">
                  <h3 class="changelog-version">
                    {versionLabel(release.version)}
                  </h3>
                  <Show when={release.date}>
                    {(date) => (
                      <time class="changelog-date" dateTime={date()}>
                        {formatDate(date())}
                      </time>
                    )}
                  </Show>
                </div>

                <Show
                  when={release.sections.length > 0}
                  fallback={
                    <p class="changelog-empty">
                      Nothing has shipped since the last release yet.
                    </p>
                  }
                >
                  <For each={release.sections}>
                    {(section) => (
                      <section class="changelog-section">
                        <h4 class="changelog-section-title">{section.kind}</h4>
                        <ul class="changelog-items">
                          <For each={section.changes}>
                            {(change) => (
                              <li class="changelog-item">
                                <span class="changelog-item-title">
                                  <InlineText text={change.title} />
                                </span>
                                <span class="changelog-item-body">
                                  <InlineText text={change.body} />
                                </span>
                              </li>
                            )}
                          </For>
                        </ul>
                      </section>
                    )}
                  </For>
                </Show>
              </article>
            )}
          </For>
        </div>
      </main>
    </div>
  );
}
