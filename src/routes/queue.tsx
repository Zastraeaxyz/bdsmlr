import { createEffect, createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { Page, PageHeader } from "~/components/Page";
import { useAuth } from "~/lib/useAuth";
import { trackEvent } from "~/lib/analytics";
import { imageUrl } from "~/lib/legacyHtml";
import { cx } from "~/lib/cva";
import { sheetDialogClass } from "~/lib/ui";
import {
  LegacyError,
  deleteLegacyQueueItem,
  getLegacyQueue,
  legacyRequest,
  publishLegacyQueueItem,
  scheduleLegacyQueueItem,
} from "~/lib/legacy";
import type { LegacyQueue, LegacyQueueItem } from "~/lib/legacyQueue";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPortal,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Switch,
  SwitchControl,
  SwitchInput,
  SwitchLabel,
  SwitchThumb,
} from "~/components/ui/switch";

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

const HOUR_OPTIONS = HOURS.map((hour) => ({
  value: String(hour),
  label: `${hour}:00`,
}));

type SelectOption = { value: string; label: string };

const inputClass =
  "flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:h-9 md:text-sm dark:bg-input/30";

type QueueAction = { kind: "publish" | "delete"; item: LegacyQueueItem };

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
  const [pending, setPending] = createSignal<QueueAction | null>(null);
  const [confirmOpen, setConfirmOpen] = createSignal(false);

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
          ? "BDSMLR is rate limiting requests right now. This usually clears in a minute or two."
          : (err as Error)?.message || "Queue action failed",
      );
    } finally {
      setBusy("");
    }
  };

  const publish = (item: LegacyQueueItem) => {
    setPending({ kind: "publish", item });
    setConfirmOpen(true);
  };

  const remove = (item: LegacyQueueItem) => {
    setPending({ kind: "delete", item });
    setConfirmOpen(true);
  };

  const pendingLabel = () => {
    const action = pending();
    if (!action) return "";
    return action.item.title || action.item.text || action.item.id;
  };

  const confirmPending = () => {
    const action = pending();
    if (!action) return;
    if (action.kind === "publish") {
      void run(
        "publish",
        () => publishLegacyQueueItem(action.item.id),
        "Post published.",
      );
    } else {
      void run(
        "delete",
        () => deleteLegacyQueueItem(action.item.id),
        "Post removed from the queue.",
      );
    }
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
      <Page info="Queue">
        <Title>Queue - bbdsmlr</Title>
        <PageHeader title="Queue" />

        <Show when={error()}>
          <Alert variant="destructive" class="mb-3">
            <AlertDescription>{error()}</AlertDescription>
          </Alert>
        </Show>
        <Show when={notice()}>
          <Alert class="mb-3 border-primary/40 bg-primary/10">
            <AlertDescription class="text-foreground">{notice()}</AlertDescription>
          </Alert>
        </Show>
        <Show when={loading()}>
          <p class="py-12 text-center text-sm text-muted-foreground">
            Loading queue…
          </p>
        </Show>

        <Show when={!loading() && queue()}>
          <Card class="mb-4 gap-5 p-4 sm:p-5">
            <h3 class="text-base font-semibold">Queue settings</h3>

            <Switch
              checked={queue()!.settings.running}
              onChange={setRunning}
              disabled={busy() !== ""}
              class="flex items-center gap-3"
            >
              <SwitchInput />
              <SwitchControl>
                <SwitchThumb />
              </SwitchControl>
              <SwitchLabel class="font-normal">
                {queue()!.settings.running ? "Queue running" : "Queue paused"}
              </SwitchLabel>
            </Switch>

            <div class="grid gap-3 sm:grid-cols-2">
              <div class="flex flex-col gap-1.5">
                <Select<SelectOption>
                  options={HOUR_OPTIONS}
                  optionValue="value"
                  optionTextValue="label"
                  value={HOUR_OPTIONS.find(
                    (option) =>
                      option.value === String(queue()!.settings.startHour),
                  )}
                  onChange={(option) => option && setHour("start", Number(option.value))}
                  disabled={busy() !== ""}
                  itemComponent={(props) => (
                    <SelectItem item={props.item}>
                      {(props.item.rawValue as SelectOption).label}
                    </SelectItem>
                  )}
                >
                  <SelectLabel>Start hour</SelectLabel>
                  <SelectTrigger class="h-11 w-full md:h-9">
                    <SelectValue<SelectOption>>
                      {(state) => state.selectedOption().label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectContent />
                  </SelectPortal>
                </Select>
              </div>

              <div class="flex flex-col gap-1.5">
                <Select<SelectOption>
                  options={HOUR_OPTIONS}
                  optionValue="value"
                  optionTextValue="label"
                  value={HOUR_OPTIONS.find(
                    (option) =>
                      option.value === String(queue()!.settings.endHour),
                  )}
                  onChange={(option) => option && setHour("end", Number(option.value))}
                  disabled={busy() !== ""}
                  itemComponent={(props) => (
                    <SelectItem item={props.item}>
                      {(props.item.rawValue as SelectOption).label}
                    </SelectItem>
                  )}
                >
                  <SelectLabel>End hour</SelectLabel>
                  <SelectTrigger class="h-11 w-full md:h-9">
                    <SelectValue<SelectOption>>
                      {(state) => state.selectedOption().label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectContent />
                  </SelectPortal>
                </Select>
              </div>

              <div class="flex flex-col gap-1.5">
                <Select<SelectOption>
                  options={INTERVALS}
                  optionValue="value"
                  optionTextValue="label"
                  value={INTERVALS.find(
                    (entry) => entry.value === queue()!.settings.interval,
                  )}
                  onChange={(option) => option && setInterval(option.value)}
                  disabled={busy() !== ""}
                  itemComponent={(props) => (
                    <SelectItem item={props.item}>
                      {(props.item.rawValue as SelectOption).label}
                    </SelectItem>
                  )}
                >
                  <SelectLabel>Posting interval</SelectLabel>
                  <SelectTrigger class="h-11 w-full md:h-9">
                    <SelectValue<SelectOption>>
                      {(state) => state.selectedOption().label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectContent />
                  </SelectPortal>
                </Select>
              </div>

              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium">Timezone</span>
                <input
                  type="text"
                  value={queue()!.settings.timezone}
                  disabled={busy() !== ""}
                  onBlur={(e) => setTimezone(e.currentTarget.value)}
                  onChange={(e) => setTimezone(e.currentTarget.value)}
                  placeholder="America/New_York"
                  class={inputClass}
                />
              </label>
            </div>

            <Switch
              checked={queue()!.settings.random}
              onChange={setRandom}
              disabled={busy() !== ""}
              class="flex items-center gap-3"
            >
              <SwitchInput />
              <SwitchControl>
                <SwitchThumb />
              </SwitchControl>
              <SwitchLabel class="font-normal">
                Randomize posting order
              </SwitchLabel>
            </Switch>
          </Card>

          <p class="mb-2.5 text-sm text-muted-foreground">
            Posts in queue: {queue()!.count}
          </p>

          <Show
            when={queue()!.items.length > 0}
            fallback={
              <p class="py-10 text-center text-sm text-muted-foreground">
                No posts in the queue.
              </p>
            }
          >
            <div class="flex flex-col gap-3">
              <For each={queue()!.items}>
                {(item) => (
                  <Card class="flex-col gap-3 p-3 sm:flex-row sm:gap-4">
                    <Show when={item.image}>
                      <img
                        class="h-40 w-full rounded-lg border object-cover sm:size-28"
                        src={imageUrl(item.image)}
                        alt=""
                      />
                    </Show>
                    <div class="min-w-0 flex-1">
                      <Show when={item.title}>
                        <h3 class="text-sm font-semibold">{item.title}</h3>
                      </Show>
                      <Show when={item.text}>
                        <p class="mt-1 text-sm leading-relaxed break-words text-muted-foreground">
                          {item.text}
                        </p>
                      </Show>
                      <Show when={item.tags.length > 0}>
                        <div class="mt-2 flex flex-wrap gap-1.5">
                          <For each={item.tags}>
                            {(tag) => <Badge variant="secondary">#{tag}</Badge>}
                          </For>
                        </div>
                      </Show>
                      <div class="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="datetime-local"
                          aria-label="Schedule date and time"
                          value={
                            scheduleValues()[item.id] ?? toLocalInput(item.scheduledAt)
                          }
                          onInput={(e) =>
                            setScheduleValues((prev) => ({
                              ...prev,
                              [item.id]: e.currentTarget.value,
                            }))
                          }
                          class={cx(inputClass, "sm:max-w-60")}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          class="h-11 w-full sm:h-9 sm:w-auto"
                          onClick={() => schedule(item)}
                          disabled={busy() !== ""}
                        >
                          {busy() === "schedule" ? "Saving…" : "Set time"}
                        </Button>
                      </div>
                      <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <Button
                          type="button"
                          class="h-11 w-full sm:h-9 sm:w-auto"
                          onClick={() => publish(item)}
                          disabled={busy() !== ""}
                        >
                          {busy() === "publish" ? "Publishing…" : "Publish now"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          class="h-11 w-full sm:h-9 sm:w-auto"
                          onClick={() => edit(item)}
                          disabled={busy() !== ""}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          class="h-11 w-full text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-9 sm:w-auto"
                          onClick={() => remove(item)}
                          disabled={busy() !== ""}
                        >
                          {busy() === "delete" ? "Removing…" : "Delete"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </For>
            </div>
          </Show>
        </Show>

        <AlertDialog open={confirmOpen()} onOpenChange={setConfirmOpen}>
          <AlertDialogPortal>
            <AlertDialogContent class={sheetDialogClass}>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {pending()?.kind === "delete" ? "Remove post?" : "Publish now?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {pending()?.kind === "delete"
                    ? "Remove this post from the queue?"
                    : `Publish "${pendingLabel()}" now?`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  class={
                    pending()?.kind === "delete"
                      ? "bg-destructive text-white hover:bg-destructive/90"
                      : undefined
                  }
                  onClick={confirmPending}
                >
                  {pending()?.kind === "delete" ? "Remove" : "Publish"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogPortal>
        </AlertDialog>
      </Page>
    </Show>
  );
}
