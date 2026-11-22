import { A, useNavigate } from "@solidjs/router";
import { createEffect, createSignal, For, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { Page, PageHeader } from "~/components/Page";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import {
  TextField,
  TextFieldInput,
  TextFieldLabel,
} from "~/components/ui/text-field";
import { useAuth } from "~/lib/useAuth";
import { features } from "~/lib/features";
import {
  changeLegacyBlogName,
  changeLegacyEmail,
  changeLegacyPassword,
  LegacyError,
} from "~/lib/legacy";
import { trackEvent } from "~/lib/analytics";

const linkRowClass =
  "flex min-h-11 items-center rounded-md px-3 text-sm font-medium outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, loading, blogs, activeBlog } = useAuth();
  const [newEmail, setNewEmail] = createSignal("");
  const [newPassword, setNewPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [newBlogName, setNewBlogName] = createSignal("");
  const [busy, setBusy] = createSignal("");
  const [error, setError] = createSignal("");
  const [notice, setNotice] = createSignal("");

  createEffect(() => {
    if (!loading() && !user()) navigate("/login", { replace: true });
  });

  const run = async (label: string, action: () => Promise<unknown>, success: string) => {
    if (busy()) return;
    setBusy(label);
    setError("");
    setNotice("");
    try {
      await action();
      trackEvent("settings-save", { field: label });
      setNotice(success);
    } catch (err: unknown) {
      setError(
        err instanceof LegacyError && err.status === 429
          ? "BDSMLR is rate limiting requests right now. This usually clears in a minute or two."
          : (err as Error)?.message || "Request failed",
      );
    } finally {
      setBusy("");
    }
  };

  const submitEmail = (e: Event) => {
    e.preventDefault();
    const email = newEmail().trim();
    if (!email) return;
    void run(
      "email",
      () => changeLegacyEmail(email),
      "Email change request sent.",
    );
  };

  const submitPassword = (e: Event) => {
    e.preventDefault();
    const password = newPassword();
    if (!password || password !== confirmPassword()) {
      setError("Passwords do not match.");
      return;
    }
    void run(
      "password",
      () => changeLegacyPassword(password, confirmPassword()),
      "Password changed.",
    );
  };

  const submitBlogName = (e: Event) => {
    e.preventDefault();
    const name = newBlogName().trim();
    if (!name) return;
    void run(
      "blogname",
      () => changeLegacyBlogName(name),
      "Blog name changed. Sign out and back in to refresh the app.",
    );
  };

  return (
    <Show when={!loading() && user()} fallback={null}>
      <Page info="Settings">
        <Title>Settings - bbdsmlr</Title>
        <PageHeader
          title="Settings"
          description="Your account details and the tools that live on BDSMLR."
        />

        <Card class="mb-3 gap-4">
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            <dl class="grid gap-2 text-sm">
              <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <dt class="text-muted-foreground">Username</dt>
                <dd class="min-w-0 break-all font-medium">
                  @{user()!.username || user()!.blog_name}
                </dd>
              </div>
              <Show when={user()!.email}>
                <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <dt class="text-muted-foreground">Email</dt>
                  <dd class="min-w-0 break-all font-medium">{user()!.email}</dd>
                </div>
              </Show>
              <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <dt class="text-muted-foreground">Active blog</dt>
                <dd class="min-w-0 break-all font-medium">
                  @{activeBlog()?.name ?? user()!.blog_name}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Show when={features.legacyAccountSettings}>
          <Card class="mb-3 gap-4">
            <CardHeader>
              <CardTitle>Account changes</CardTitle>
            </CardHeader>
            <CardContent class="flex flex-col gap-4">
              <Show when={error()}>
                <Alert variant="destructive">
                  <AlertDescription>{error()}</AlertDescription>
                </Alert>
              </Show>
              <Show when={notice()}>
                <Alert>
                  <AlertDescription>{notice()}</AlertDescription>
                </Alert>
              </Show>

              <form class="flex flex-col gap-3" onSubmit={submitEmail}>
                <TextField value={newEmail()} onChange={setNewEmail}>
                  <TextFieldLabel>Change email</TextFieldLabel>
                  <TextFieldInput
                    type="email"
                    class="h-11 md:h-9"
                    placeholder={user()!.email || "new@example.com"}
                  />
                </TextField>
                <Button
                  type="submit"
                  class="h-11 md:h-9 w-full sm:w-auto sm:self-start"
                  disabled={!newEmail().trim() || busy() !== ""}
                >
                  {busy() === "email" ? "Saving…" : "Change email"}
                </Button>
              </form>

              <Separator />

              <form class="flex flex-col gap-3" onSubmit={submitPassword}>
                <TextField value={newPassword()} onChange={setNewPassword}>
                  <TextFieldLabel>New password</TextFieldLabel>
                  <TextFieldInput type="password" class="h-11 md:h-9" />
                </TextField>
                <TextField
                  value={confirmPassword()}
                  onChange={setConfirmPassword}
                >
                  <TextFieldLabel>Confirm password</TextFieldLabel>
                  <TextFieldInput type="password" class="h-11 md:h-9" />
                </TextField>
                <Button
                  type="submit"
                  class="h-11 md:h-9 w-full sm:w-auto sm:self-start"
                  disabled={!newPassword() || !confirmPassword() || busy() !== ""}
                >
                  {busy() === "password" ? "Saving…" : "Change password"}
                </Button>
              </form>

              <Separator />

              <form class="flex flex-col gap-3" onSubmit={submitBlogName}>
                <TextField value={newBlogName()} onChange={setNewBlogName}>
                  <TextFieldLabel>Change blog name</TextFieldLabel>
                  <TextFieldInput
                    type="text"
                    class="h-11 md:h-9"
                    placeholder={activeBlog()?.name || "blogname"}
                  />
                </TextField>
                <Button
                  type="submit"
                  class="h-11 md:h-9 w-full sm:w-auto sm:self-start"
                  disabled={!newBlogName().trim() || busy() !== ""}
                >
                  {busy() === "blogname" ? "Saving…" : "Change blog name"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </Show>

        <Card class="mb-3 gap-4">
          <CardHeader>
            <CardTitle>Your blogs</CardTitle>
          </CardHeader>
          <CardContent class="flex flex-col gap-1">
            <For each={blogs()}>
              {(blog) => (
                <A href={`/${blog.name}`} class={linkRowClass}>
                  @{blog.name}
                </A>
              )}
            </For>
          </CardContent>
        </Card>

        <Card class="mb-3 gap-4">
          <CardHeader>
            <CardTitle>More</CardTitle>
          </CardHeader>
          <CardContent class="flex flex-col gap-1">
            <Show when={features.legacyBlogCustomization}>
              <A href="/customize" class={linkRowClass}>
                Customize blog
              </A>
            </Show>
            <A href="/blocked" class={linkRowClass}>
              Blocked blogs
            </A>
            <A href="/compose" class={linkRowClass}>
              Compose post
            </A>
            <Show when={features.legacyAdvancedSettings}>
              <a
                href="https://bdsmlr.com/settings"
                target="_blank"
                rel="noopener noreferrer"
                class={linkRowClass}
              >
                BDSMLR settings
              </a>
            </Show>
            <A href="/queue" class={linkRowClass}>
              Queue
            </A>
            <A href="/drafts" class={linkRowClass}>
              Drafts
            </A>
            <Show when={features.legacyAsks}>
              <a
                href="https://bdsmlr.com/asks"
                target="_blank"
                rel="noopener noreferrer"
                class={linkRowClass}
              >
                BDSMLR asks
              </a>
            </Show>
            <Show when={features.legacySubmissions}>
              <a
                href="https://bdsmlr.com/submissions"
                target="_blank"
                rel="noopener noreferrer"
                class={linkRowClass}
              >
                BDSMLR submissions
              </a>
            </Show>
          </CardContent>
        </Card>

        <p class="mt-1 px-1 text-xs leading-relaxed text-muted-foreground">
          Account changes, customization, drafts, and other legacy tools are
          hidden until their BDSMLR backend behavior is verified.
        </p>
      </Page>
    </Show>
  );
}
