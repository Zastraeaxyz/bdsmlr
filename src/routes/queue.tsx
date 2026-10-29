import { createEffect, createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import Header from "~/components/Header";
import { useAuth } from "~/lib/useAuth";
import { trackEvent } from "~/lib/analytics";
import { imageUrl } from "~/lib/legacyHtml";
import {
  LegacyError,
  deleteLegacyQueueItem,
  getLegacyQueue,
  legacyRequest,
  publishLegacyQueueItem,
  scheduleLegacyQueueItem,
} from "~/lib/legacy";
import type { LegacyQueue, LegacyQueueItem } from "~/lib/legacyQueue";

const INTERVALS = [
  { value: "5", label: "Every 5 minutes" },
  { value: "10", label: "Every 10 minutes" },
  { value: "15", label: "Every 15 minutes" },
  { value: "30", label: "Every 30 minutes" },
  { value: "60", label: "Once an hour" },
  { value: "12", label: "Every 2 hours" },
  { value: "8", label: "Every 3 hours" },
  { value: "6", label: "Every 4 hours" },
  { value: "4", label: "Every 6 hours" },
  { value: "2", label: "Every 12 hours" },
  { value: "1", label: "Once a day" },
];

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function toLocalInput(value: string): string {
  if (!value) return "";
  return value.replace(" ", "T").slice(0, 16);
}

export default function QueuePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [queue, setQueue] = createSignal<LegacyQueue | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [busy, setBusy] = createSignal("");
  const [error, setError] = createSignal("");
  const [notice, setNotice] = createSignal("");
  const [scheduleValues, setScheduleValues] = createSignal<Record<string, string>>({});

  createEffect(() => {
    if (!authLoading() && !user()) navigate("/login", { replace: true });
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setQueue(await getLegacyQueue());
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not load the queue");
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    if (authLoading() || !user()) return;
    void load();
  });

  const run = async (
    label: string,
    action: () => Promise<unknown>,
    success: string,
  ) => {
    if (busy()) return;
    setBusy(label);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      trackEvent("queue-action", { action: label });
      await load();
    } catch (err: unknown) {
      setError(
        err instanceof LegacyError && err.status === 429
          ? "BDSMLR temporarily blocked the request. Wait a moment and try again."
          : (err as Error)?.message || "Queue action failed",
      );
    } finally {
      setBusy("");
    }
  };

  const publish = (item: LegacyQueueItem) => {
    if (!window.confirm(`Publish "${item.title || item.text || item.id}" now?`)) return;
    void run(
      "publish",
      () => publishLegacyQueueItem(item.id),
      "Post published.",
    );
  };

  const remove = (item: LegacyQueueItem) => {
    if (!window.confirm("Remove this post from the queue?")) return;
    void run(
      "delete",
      () => deleteLegacyQueueItem(item.id),
      "Post removed from the queue.",
    );
  };

  const schedule = (item: LegacyQueueItem) => {
    const value = scheduleValues()[item.id] ?? toLocalInput(item.scheduledAt);
    if (!value) {
      setError("Choose a date and time first.");
      return;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      setError("That date and time is not valid.");
      return;
    }
    void run(
      "schedule",
      () => scheduleLegacyQueueItem(item.id, date),
      "Schedule updated.",
    );
  };

  const setRunning = (running: boolean) => {
    void run(
      "settings",
      () => legacyRequest("/queuepause", { value: running ? 0 : 1 }),
      running ? "Queue resumed." : "Queue paused.",
    );
  };

  const setHour = (field: "start" | "end", hour: number) => {
    void run(
      "settings",
      () =>
        legacyRequest(field === "start" ? "/qtimefirst" : "/qtimesecond", {
          time: hour,
        }),
      "Queue hours updated.",
    );
  };

  const setInterval = (value: string) => {
    void run(
      "settings",
      () => legacyRequest("/qtimequeue", { time: value }),
      "Queue interval updated.",
    );
  };

  const setRandom = (random: boolean) => {
    void run(
      "settings",
      () => legacyRequest("/randomqueue", { randomTime: random ? 1 : 0 }),
      "Queue order updated.",
    );
  };

  const setTimezone = (timezone: string) => {
    const value = timezone.trim();
    if (!value) return;
    void run(
      "settings",
      () => legacyRequest("/timezonechange", { timezone: value }),
      "Queue timezone updated.",
    );
  };

  const edit = (item: LegacyQueueItem) => {
    navigate(`/compose?queue=${encodeURIComponent(item.id)}`);
  };

  return (
    <Show when={!authLoading() && user()} fallback={null}>
      <Title>Queue - bbdsmlr</Title>
      <div class="home-page">
        <Header info="Queue" />
        <main>
          <h2 class="social-list-title">Queue</h2>
          {error() && <p class="error">{error()}</p>}
          {notice() && <p class="action-notice">{notice()}</p>}
          {loading() && <p class="loading">Loading queue…</p>}

          <Show when={!loading() && queue()}>
            <section class="compose-card queue-settings">
              <h3>Queue settings</h3>
              <label class="queue-toggle">
                <input
                  type="checkbox"
                  checked={queue()!.settings.running}
                  disabled={busy() !== ""}
                  onChange={(e) => setRunning(e.currentTarget.checked)}
                />
                <span>
                  {queue()!.settings.running ? "Queue running" : "Queue paused"}
                </span>
              </label>
              <div class="queue-settings-grid">
                <label class="compose-field">
                  <span>Start hour</span>
                  <select
                    value={String(queue()!.settings.startHour)}
                    disabled={busy() !== ""}
                    onChange={(e) => setHour("start", Number(e.currentTarget.value))}
                  >
                    <For each={HOURS}>
                      {(hour) => <option value={hour}>{hour}:00</option>}
                    </For>
                  </select>
                </label>
                <label class="compose-field">
                  <span>End hour</span>
                  <select
                    value={String(queue()!.settings.endHour)}
                    disabled={busy() !== ""}
                    onChange={(e) => setHour("end", Number(e.currentTarget.value))}
                  >
                    <For each={HOURS}>
                      {(hour) => <option value={hour}>{hour}:00</option>}
                    </For>
                  </select>
                </label>
                <label class="compose-field">
                  <span>Posting interval</span>
                  <select
                    value={queue()!.settings.interval}
                    disabled={busy() !== ""}
                    onChange={(e) => setInterval(e.currentTarget.value)}
                  >
                    <For each={INTERVALS}>
                      {(entry) => <option value={entry.value}>{entry.label}</option>}
                    </For>
                  </select>
                </label>
                <label class="compose-field">
                  <span>Timezone</span>
                  <input
                    type="text"
                    value={queue()!.settings.timezone}
                    disabled={busy() !== ""}
                    onBlur={(e) => setTimezone(e.currentTarget.value)}
                    onChange={(e) => setTimezone(e.currentTarget.value)}
                    placeholder="America/New_York"
                  />
                </label>
              </div>
              <label class="queue-toggle">
                <input
                  type="checkbox"
                  checked={queue()!.settings.random}
                  disabled={busy() !== ""}
                  onChange={(e) => setRandom(e.currentTarget.checked)}
                />
                <span>Randomize posting order</span>
              </label>
            </section>

            <p class="queue-count">
              Posts in queue: {queue()!.count}
            </p>

            <Show
              when={queue()!.items.length > 0}
              fallback={<p class="empty">No posts in the queue.</p>}
            >
              <div class="draft-list">
                <For each={queue()!.items}>
                  {(item) => (
                    <article class="draft-card queue-card">
                      <Show when={item.image}>
                        <img class="draft-image" src={imageUrl(item.image)} alt="" />
                      </Show>
                      <div class="draft-content">
                        <Show when={item.title}>
                          <h3>{item.title}</h3>
                        </Show>
                        <Show when={item.text}>
                          <p>{item.text}</p>
                        </Show>
                        <Show when={item.tags.length > 0}>
                          <div class="draft-tags">
                            <For each={item.tags}>
                              {(tag) => <span class="tag">#{tag}</span>}
                            </For>
                          </div>
                        </Show>
                        <div class="queue-schedule">
                          <input
                            type="datetime-local"
                            value={
                              scheduleValues()[item.id] ?? toLocalInput(item.scheduledAt)
                            }
                            onInput={(e) =>
                              setScheduleValues((prev) => ({
                                ...prev,
                                [item.id]: e.currentTarget.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            class="btn-ghost"
                            onClick={() => schedule(item)}
                            disabled={busy() !== ""}
                          >
                            {busy() === "schedule" ? "Saving…" : "Set time"}
                          </button>
                        </div>
                        <div class="draft-actions">
                          <button
                            type="button"
                            onClick={() => publish(item)}
                            disabled={busy() !== ""}
                          >
                            {busy() === "publish" ? "Publishing…" : "Publish now"}
                          </button>
                          <button
                            type="button"
                            class="btn-ghost"
                            onClick={() => edit(item)}
                            disabled={busy() !== ""}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            class="btn-ghost danger-text"
                            onClick={() => remove(item)}
                            disabled={busy() !== ""}
                          >
                            {busy() === "delete" ? "Removing…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </main>
      </div>
    </Show>
  );
}
