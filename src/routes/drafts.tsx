import { createEffect, createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { Page, PageHeader } from "~/components/Page";
import { useAuth } from "~/lib/useAuth";
import {
  deleteLegacyDraft,
  getLegacyDrafts,
  LegacyError,
  publishLegacyDraft,
} from "~/lib/legacy";
import type { LegacyDraft } from "~/lib/legacyDrafts";
import { trackEvent } from "~/lib/analytics";
import { sheetDialogClass } from "~/lib/ui";
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

function imageUrl(value?: string): string {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://bdsmlr.com${value.startsWith("/") ? "" : "/"}${value}`;
}

export default function DraftsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [drafts, setDrafts] = createSignal<LegacyDraft[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [busy, setBusy] = createSignal("");
  const [error, setError] = createSignal("");
  const [notice, setNotice] = createSignal("");
  const [pendingDraft, setPendingDraft] = createSignal<LegacyDraft | null>(null);

  createEffect(() => {
    if (!authLoading() && !user()) navigate("/login", { replace: true });
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setDrafts(await getLegacyDrafts());
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not load drafts");
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    if (authLoading() || !user()) return;
    void load();
  });

  const run = async (
    id: string,
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
      trackEvent("draft-action", { action: label });
      setNotice(success);
      setDrafts((prev) => prev.filter((draft) => draft.id !== id));
    } catch (err: unknown) {
      setError(
        err instanceof LegacyError && err.status === 429
          ? "BDSMLR is rate limiting requests right now. This usually clears in a minute or two."
          : err instanceof LegacyError && err.status === 500
            ? "BDSMLR returned a server error for this draft action. Try again later."
            : (err as Error)?.message || "Draft action failed",
      );
    } finally {
      setBusy("");
    }
  };

  const remove = (draft: LegacyDraft) => {
    setPendingDraft(draft);
  };

  const confirmRemove = () => {
    const draft = pendingDraft();
    if (!draft) return;
    void run(
      draft.id,
      "delete",
      () => deleteLegacyDraft(draft.id),
      "Draft deleted.",
    );
  };

  return (
    <Show when={!authLoading() && user()} fallback={null}>
      <Page info="Drafts">
        <Title>Drafts - bbdsmlr</Title>
        <PageHeader title="Drafts" />

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
            Loading drafts…
          </p>
        </Show>
        <Show when={!loading()}>
          <Show
            when={drafts().length > 0}
            fallback={
              <p class="py-10 text-center text-sm text-muted-foreground">
                No drafts.
              </p>
            }
          >
            <div class="flex flex-col gap-3">
              <For each={drafts()}>
                {(draft) => (
                  <Card class="flex-col gap-3 p-3 sm:flex-row sm:gap-4">
                    <Show when={draft.image}>
                      <img
                        class="h-40 w-full rounded-lg border object-cover sm:size-28"
                        src={imageUrl(draft.image)}
                        alt=""
                      />
                    </Show>
                    <div class="min-w-0 flex-1">
                      <Show when={draft.title}>
                        <h3 class="text-sm font-semibold">{draft.title}</h3>
                      </Show>
                      <Show when={draft.text}>
                        <p class="mt-1 text-sm leading-relaxed break-words text-muted-foreground">
                          {draft.text}
                        </p>
                      </Show>
                      <Show when={draft.tags.length > 0}>
                        <div class="mt-2 flex flex-wrap gap-1.5">
                          <For each={draft.tags}>
                            {(tag) => <Badge variant="secondary">#{tag}</Badge>}
                          </For>
                        </div>
                      </Show>
                      <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          class="h-11 w-full sm:h-9 sm:w-auto"
                          onClick={() =>
                            navigate(`/compose?draft=${encodeURIComponent(draft.id)}`)
                          }
                          disabled={busy() !== ""}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          class="h-11 w-full sm:h-9 sm:w-auto"
                          onClick={() =>
                            void run(
                              draft.id,
                              "publish",
                              () => publishLegacyDraft(draft.id, false),
                              "Draft published.",
                            )
                          }
                          disabled={busy() !== ""}
                        >
                          {busy() === "publish" ? "Publishing…" : "Publish"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          class="h-11 w-full sm:h-9 sm:w-auto"
                          onClick={() =>
                            void run(
                              draft.id,
                              "queue",
                              () => publishLegacyDraft(draft.id, true),
                              "Draft moved to the queue.",
                            )
                          }
                          disabled={busy() !== ""}
                        >
                          {busy() === "queue" ? "Moving…" : "Publish to queue"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          class="h-11 w-full text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-9 sm:w-auto"
                          onClick={() => remove(draft)}
                          disabled={busy() !== ""}
                        >
                          {busy() === "delete" ? "Deleting…" : "Delete"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </For>
            </div>
          </Show>
        </Show>
        <p class="mt-4 text-xs leading-relaxed text-muted-foreground">
          Drafts use BDSMLR's legacy editor. You can edit, publish, move to
          the queue, or delete a draft here.
        </p>

        <AlertDialog
          open={pendingDraft() !== null}
          onOpenChange={(open) => {
            if (!open) setPendingDraft(null);
          }}
        >
          <AlertDialogPortal>
            <AlertDialogContent class={sheetDialogClass}>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
                <AlertDialogDescription>
                  This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  class="bg-destructive text-white hover:bg-destructive/90"
                  onClick={confirmRemove}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogPortal>
        </AlertDialog>
      </Page>
    </Show>
  );
}
