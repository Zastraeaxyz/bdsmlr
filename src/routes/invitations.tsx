import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Show,
} from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { Page, PageHeader } from "~/components/Page";
import { EmptyState } from "~/components/FeedStates";
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
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Checkbox,
  CheckboxControl,
  CheckboxLabel,
} from "~/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  TextField,
  TextFieldInput,
  TextFieldLabel,
  TextFieldTextArea,
} from "~/components/ui/text-field";
import { cx } from "~/lib/cva";
import { useAuth } from "~/lib/useAuth";
import { trackEvent } from "~/lib/analytics";
import {
  accountCookieProblem,
  connectAccountSite,
  disconnectAccountSite,
  getAcceptedInvitations,
  getInvitationSession,
  getInvitations,
  invitationAction,
  InvitationsError,
  loginAccountSite,
  sendInvitation,
  type AcceptedInvitation,
  type AccountSession,
  type Invitation,
  type InvitationsData,
} from "~/lib/invitations";

function messageOf(err: unknown): string {
  if (err instanceof InvitationsError) return err.message;
  return (err as Error)?.message || "Something went wrong.";
}

function friendlyDate(value: string): string {
  if (!value) return "";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusLabel(invitation: Invitation): string {
  if (invitation.accepted) return "Accepted";
  if (!invitation.sent) return "Not sent";
  return "Pending";
}

function statusVariant(invitation: Invitation) {
  if (invitation.accepted) return "secondary" as const;
  if (!invitation.sent) return "outline" as const;
  return "default" as const;
}

type ConfirmRequest = {
  text: string;
  confirmLabel: string;
  destructive?: boolean;
  run: () => void;
};

const inlineLinkClass =
  "font-medium text-primary underline underline-offset-4 hover:no-underline";

export default function InvitationsPage() {
  const navigate = useNavigate();
  const { user, activeBlog, loading: authLoading } = useAuth();

  const [initialized, setInitialized] = createSignal(false);
  const [session, setSession] = createSignal<AccountSession | null>(null);
  const [checking, setChecking] = createSignal(true);
  const [data, setData] = createSignal<InvitationsData | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [loadingNotifications, setLoadingNotifications] = createSignal(false);
  const [error, setError] = createSignal("");
  const [notice, setNotice] = createSignal("");
  const [mode, setMode] = createSignal<"login" | "session">("login");
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [cookieInput, setCookieInput] = createSignal("");
  const [usernameInput, setUsernameInput] = createSignal("");
  const [authBusy, setAuthBusy] = createSignal(false);
  const [inviteEmail, setInviteEmail] = createSignal("");
  const [inviteMessage, setInviteMessage] = createSignal("");
  const [sending, setSending] = createSignal(false);
  const [busy, setBusy] = createSignal("");
  const [selected, setSelected] = createSignal<Set<string>>(new Set());
  const [page, setPage] = createSignal(1);
  const [notificationsPage, setNotificationsPage] = createSignal(1);
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [confirmRequest, setConfirmRequest] =
    createSignal<ConfirmRequest | null>(null);

  const askConfirm = (request: ConfirmRequest) => {
    setConfirmRequest(request);
    setConfirmOpen(true);
  };

  const usernameCandidate = () => {
    const current = user();
    return (
      current?.username ||
      current?.blog_name ||
      activeBlog()?.name ||
      ""
    );
  };

  const invitations = () => data()?.invitations ?? [];
  const notifications = () => data()?.notifications ?? [];
  const pendingInvitations = createMemo(() =>
    invitations().filter((invitation) => !invitation.accepted),
  );
  const acceptedInvitations = createMemo(() =>
    invitations().filter((invitation) => invitation.accepted),
  );
  const selectedIds = createMemo(() => [...selected()]);
  const selectedPendingIds = createMemo(() =>
    invitations()
      .filter(
        (invitation) => selected().has(invitation.id) && !invitation.accepted,
      )
      .map((invitation) => invitation.id),
  );
  const allSelected = createMemo(
    () =>
      invitations().length > 0 &&
      invitations().every((invitation) => selected().has(invitation.id)),
  );

  const checkSession = async () => {
    setChecking(true);
    setError("");
    try {
      const result = await getInvitationSession(usernameCandidate());
      setSession(result);
      if (result.connected && result.userLogin) {
        setUsernameInput(result.userLogin);
        await loadInvitations(1, 1, result.userLogin);
      }
    } catch (err) {
      setSession({
        connected: false,
        loginBlocked: false,
        loginUrl: "https://account.bdsmlr.com/wp-login.php",
      });
      setError(messageOf(err));
    } finally {
      setChecking(false);
    }
  };

  const handleSessionError = (err: unknown): boolean => {
    if (
      err instanceof InvitationsError &&
      err.code === "account_session_required"
    ) {
      setSession({
        connected: false,
        expired: true,
        loginBlocked: session()?.loginBlocked,
        loginUrl: session()?.loginUrl,
      });
      setData(null);
      setSelected(new Set<string>());
      return true;
    }
    return false;
  };

  const loadInvitations = async (
    nextPage = page(),
    nextNotifications = notificationsPage(),
    userLogin = session()?.userLogin || usernameInput(),
  ) => {
    if (!userLogin) return;
    setLoading(true);
    setError("");
    try {
      const result = await getInvitations(
        nextPage,
        nextNotifications,
        userLogin,
      );
      setData(result);
      setPage(nextPage);
      setNotificationsPage(nextNotifications);
      const nextSession = result.session ?? { connected: true, userLogin };
      setSession(nextSession);
      setSelected(new Set<string>());
      if (nextSession.userLogin) setUsernameInput(nextSession.userLogin);
    } catch (err) {
      if (!handleSessionError(err)) setError(messageOf(err));
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async (nextPage: number) => {
    const userLogin = session()?.userLogin || usernameInput();
    if (!userLogin) return;
    setLoadingNotifications(true);
    setError("");
    try {
      const result = await getAcceptedInvitations(nextPage, userLogin);
      setData((prev) =>
        prev
          ? {
              ...prev,
              notifications: result.accepted,
              notificationsNextPage: result.nextPage,
              notificationsError: null,
            }
          : prev,
      );
      setNotificationsPage(nextPage);
    } catch (err) {
      if (!handleSessionError(err)) setError(messageOf(err));
    } finally {
      setLoadingNotifications(false);
    }
  };

  createEffect(() => {
    if (!authLoading() && !user()) {
      navigate("/login?next=/invitations", { replace: true });
    }
  });

  createEffect(() => {
    if (authLoading() || !user() || initialized()) return;
    setInitialized(true);
    setEmail(user()!.email ?? "");
    setUsernameInput(usernameCandidate());
    void checkSession();
  });

  const submitLogin = async (e: Event) => {
    e.preventDefault();
    if (authBusy()) return;
    setAuthBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await loginAccountSite(email().trim(), password());
      setSession(result);
      setPassword("");
      setNotice("");
      trackEvent("invitation-connect", { mode: "login" });
      if (result.userLogin) {
        setUsernameInput(result.userLogin);
        await loadInvitations(1, 1, result.userLogin);
      }
    } catch (err) {
      const failure = err as InvitationsError;
      if (failure?.code === "turnstile") {
        setMode("session");
        setPassword("");
        setSession((prev) => ({
          ...(prev ?? { connected: false }),
          connected: false,
          loginBlocked: true,
          loginUrl: "https://account.bdsmlr.com/wp-login.php",
        }));
        setNotice(failure.message);
      } else {
        setError(messageOf(err));
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const cookieProblem = createMemo(() =>
    cookieInput().trim() ? accountCookieProblem(cookieInput()) : "",
  );

  const submitConnect = async (e: Event) => {
    e.preventDefault();
    if (authBusy()) return;
    const cookie = cookieInput().trim();
    const problem = accountCookieProblem(cookie);
    if (problem) {
      setError(problem);
      return;
    }
    setAuthBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await connectAccountSite(cookie, usernameInput().trim());
      setSession(result);
      setCookieInput("");
      trackEvent("invitation-connect", { mode: "cookie" });
      if (result.userLogin) {
        setUsernameInput(result.userLogin);
        await loadInvitations(1, 1, result.userLogin);
      }
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const doDisconnect = async () => {
    setError("");
    setNotice("");
    await disconnectAccountSite().catch(() => undefined);
    setData(null);
    setSelected(new Set<string>());
    setSession({
      connected: false,
      loginBlocked: session()?.loginBlocked,
      loginUrl: session()?.loginUrl,
    });
    setMode("session");
    setNotice("Account site disconnected.");
    trackEvent("invitation-connect", { mode: "disconnect" });
  };

  const handleDisconnect = () => {
    askConfirm({
      text: "Disconnect the account site? You will need to connect it again to use invitations.",
      confirmLabel: "Disconnect",
      destructive: true,
      run: () => void doDisconnect(),
    });
  };

  const submitInvite = async (e: Event) => {
    e.preventDefault();
    if (sending() || busy() !== "") return;
    const target = inviteEmail().trim();
    if (!target) {
      setError("Enter an email address first.");
      return;
    }
    setSending(true);
    setError("");
    setNotice("");
    try {
      const result = await sendInvitation(
        target,
        inviteMessage().trim(),
        session()?.userLogin || usernameInput(),
      );
      if (result.ok) {
        setNotice(result.message || "Invitation sent.");
        setInviteEmail("");
        setInviteMessage("");
        await loadInvitations(1, notificationsPage());
      } else {
        setError(result.message || "Could not send the invitation.");
      }
      trackEvent("invitation-send");
    } catch (err) {
      if (!handleSessionError(err)) setError(messageOf(err));
    } finally {
      setSending(false);
    }
  };

  const performAction = async (
    action: "resend" | "cancel",
    ids: string[],
    successText?: string,
  ) => {
    if (busy() || sending() || ids.length === 0) return;
    const busyKey = `${action}:${ids.join(",")}`;
    setBusy(busyKey);
    setError("");
    setNotice("");
    try {
      const result = await invitationAction(
        action,
        ids,
        session()?.userLogin || usernameInput(),
      );
      if (result.ok) {
        setNotice(
          successText ||
            result.message ||
            (action === "resend" ? "Invitation resent." : "Invitation canceled."),
        );
      } else {
        setError(result.message || "The invitation action failed.");
      }
      setSelected(new Set<string>());
      await loadInvitations(page(), notificationsPage());
      trackEvent("invitation-action", { action });
    } catch (err) {
      if (!handleSessionError(err)) setError(messageOf(err));
    } finally {
      setBusy("");
    }
  };

  const runAction = async (
    action: "resend" | "cancel",
    ids: string[],
    confirmText?: string,
    successText?: string,
    confirmLabel?: string,
  ) => {
    if (busy() || sending() || ids.length === 0) return;
    if (confirmText) {
      askConfirm({
        text: confirmText,
        confirmLabel:
          confirmLabel ?? (action === "resend" ? "Resend" : "Continue"),
        destructive: action === "cancel",
        run: () => void performAction(action, ids, successText),
      });
      return;
    }
    await performAction(action, ids, successText);
  };

  const bulkResend = () => {
    const ids = selectedPendingIds();
    if (ids.length === 0) {
      setError("Select at least one pending invitation to resend.");
      return;
    }
    void runAction(
      "resend",
      ids,
      `Resend ${ids.length} invitation${ids.length === 1 ? "" : "s"}?`,
    );
  };

  const bulkCancel = () => {
    const ids = selectedIds();
    if (ids.length === 0) {
      setError("Select at least one invitation first.");
      return;
    }
    void runAction(
      "cancel",
      ids,
      `Cancel or delete ${ids.length} selected invitation${ids.length === 1 ? "" : "s"}?`,
    );
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected()) {
        invitations().forEach((invitation) => next.delete(invitation.id));
      } else {
        invitations().forEach((invitation) => next.add(invitation.id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set<string>());

  return (
    <Show when={!authLoading() && user()} fallback={null}>
      <Page info="Invitations">
        <Title>Invitations - bbdsmlr</Title>
        <PageHeader
          title="Invitations"
          description="Send and manage invitations on account.bdsmlr.com."
        />

        <Show when={checking()}>
          <p class="text-sm text-muted-foreground">
            Checking the account site…
          </p>
        </Show>

        <Show when={!checking() && !session()?.connected}>
          <Card class="gap-4">
            <CardHeader>
              <CardTitle>Invitations need the account site</CardTitle>
            </CardHeader>
            <CardContent class="flex flex-col gap-4">
              <p class="text-sm leading-relaxed text-muted-foreground">
                Invitations live on{" "}
                <a
                  href="https://account.bdsmlr.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class={inlineLinkClass}
                >
                  account.bdsmlr.com
                </a>
                , a separate WordPress and BuddyPress site. Your bbdsmlr
                sign-in does not carry over, and the account site protects its
                login with Cloudflare Turnstile. The account-site password is
                only used for the sign-in attempt and is never stored.
              </p>

              <Show when={session()?.expired}>
                <Alert variant="warning">
                  <AlertDescription>
                    Your account-site session expired. Connect it again to keep
                    managing invitations.
                  </AlertDescription>
                </Alert>
              </Show>
              <Show when={session()?.loginBlocked}>
                <Alert variant="warning">
                  <AlertDescription>
                    The account site currently asks for a browser check. If the
                    sign-in form does not work, connect an existing session
                    instead.
                  </AlertDescription>
                </Alert>
              </Show>
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

              <Tabs
                value={mode()}
                onChange={(next) => {
                  if (next !== "login" && next !== "session") return;
                  setMode(next);
                  setError("");
                  setNotice("");
                }}
              >
                <TabsList class="h-11 md:h-9 w-full">
                  <TabsTrigger
                    value="login"
                    class="h-10 rounded-md data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:shadow-sm"
                    onClick={() => {
                      setError("");
                      setNotice("");
                    }}
                  >
                    Sign in
                  </TabsTrigger>
                  <TabsTrigger
                    value="session"
                    class="h-10 rounded-md data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:shadow-sm"
                    onClick={() => {
                      setError("");
                      setNotice("");
                    }}
                  >
                    Use an existing session
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form class="flex flex-col gap-3" onSubmit={submitLogin}>
                    <TextField value={email()} onChange={setEmail}>
                      <TextFieldLabel>BDSMLR email or username</TextFieldLabel>
                      <TextFieldInput
                        type="text"
                        autocomplete="username"
                        class="h-11 md:h-9"
                        required
                      />
                    </TextField>
                    <TextField value={password()} onChange={setPassword}>
                      <TextFieldLabel>BDSMLR password</TextFieldLabel>
                      <TextFieldInput
                        type="password"
                        autocomplete="current-password"
                        class="h-11 md:h-9"
                        required
                      />
                    </TextField>
                    <Button
                      type="submit"
                      class="h-11 md:h-9 w-full"
                      disabled={authBusy()}
                    >
                      {authBusy()
                        ? "Signing in…"
                        : "Sign in to the account site"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="session">
                  <form class="flex flex-col gap-3" onSubmit={submitConnect}>
                    <p class="text-sm leading-relaxed text-muted-foreground">
                      Sign in at{" "}
                      <a
                        href="https://account.bdsmlr.com/wp-login.php"
                        target="_blank"
                        rel="noopener noreferrer"
                        class={inlineLinkClass}
                      >
                        account.bdsmlr.com
                      </a>
                      , then paste the account-site session cookie here. It is
                      stored only in an HTTP-only cookie on this device and can
                      be disconnected at any time.
                    </p>
                    <TextField
                      value={usernameInput()}
                      onChange={setUsernameInput}
                    >
                      <TextFieldLabel>Account-site username</TextFieldLabel>
                      <TextFieldInput
                        type="text"
                        autocomplete="off"
                        class="h-11 md:h-9"
                        placeholder="Your account-site username"
                      />
                    </TextField>
                    <TextField
                      value={cookieInput()}
                      onChange={(next) => {
                        setCookieInput(next);
                        setError("");
                      }}
                    >
                      <TextFieldLabel>Session cookie</TextFieldLabel>
                      <TextFieldTextArea
                        rows={4}
                        autocomplete="off"
                        spellcheck={false}
                        class="font-mono"
                        placeholder="wordpress_logged_in_...=..."
                      />
                    </TextField>
                    <Show when={cookieProblem()}>
                      <Alert variant="warning">
                        <AlertDescription>{cookieProblem()}</AlertDescription>
                      </Alert>
                    </Show>
                    <details class="rounded-lg border border-border px-3 py-2 text-sm">
                      <summary class="cursor-pointer py-2 font-medium">
                        How to get the session cookie
                      </summary>
                      <ol class="mt-1 flex list-decimal flex-col gap-1 pl-5 text-muted-foreground">
                        <li>
                          Open{" "}
                          <a
                            href="https://account.bdsmlr.com/wp-login.php"
                            target="_blank"
                            rel="noopener noreferrer"
                            class={inlineLinkClass}
                          >
                            account.bdsmlr.com
                          </a>{" "}
                          and sign in.
                        </li>
                        <li>Open your browser developer tools with F12.</li>
                        <li>
                          Go to Application or Storage, then Cookies, then
                          https://account.bdsmlr.com.
                        </li>
                        <li>
                          Copy the whole cookie line named
                          <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                            {" "}
                            wordpress_logged_in_…
                          </code>
                          , starting with
                          <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                            {" "}
                            wordpress_logged_in_…=
                          </code>
                          .
                        </li>
                        <li>Paste it above and connect.</li>
                      </ol>
                      <p class="mt-2 text-muted-foreground">
                        If you prefer, copy the whole Cookie request header from
                        the Network tab. Paste it as one line. Include the
                        <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                          {" "}
                          wordpress_logged_in_…=
                        </code>
                        name: the value on its own is not accepted.
                      </p>
                    </details>
                    <Button
                      type="submit"
                      class="h-11 md:h-9 w-full"
                      disabled={authBusy() || cookieProblem() !== ""}
                    >
                      {authBusy() ? "Connecting…" : "Connect account site"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </Show>

        <Show when={!checking() && session()?.connected}>
          <Show when={error()}>
            <Alert variant="destructive" class="mb-3">
              <AlertDescription>{error()}</AlertDescription>
            </Alert>
          </Show>
          <Show when={notice()}>
            <Alert class="mb-3">
              <AlertDescription>{notice()}</AlertDescription>
            </Alert>
          </Show>

          <Card class="mb-3 gap-0 py-4">
            <CardContent class="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <p class="text-sm font-medium">
                  Connected as {session()?.userLogin}
                </p>
                <p class="text-sm text-muted-foreground">
                  Invitations are managed on account.bdsmlr.com.
                </p>
              </div>
              <div class="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  class="h-11 md:h-9"
                  disabled={loading()}
                  onClick={() => {
                    setError("");
                    setNotice("");
                    void loadInvitations(page(), notificationsPage());
                  }}
                >
                  {loading() ? "Refreshing…" : "Refresh"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  class="h-11 md:h-9 text-destructive hover:text-destructive"
                  onClick={() => void handleDisconnect()}
                >
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>

          <Show
            when={data()}
            fallback={
              <p class="text-sm text-muted-foreground">
                {loading()
                  ? "Loading invitations…"
                  : "Invitations could not be loaded."}
              </p>
            }
          >
            <Card class="mb-3 gap-4">
              <CardHeader>
                <CardTitle>Send an invite</CardTitle>
              </CardHeader>
              <CardContent class="flex flex-col gap-3">
                <p class="text-sm text-muted-foreground">
                  The invitee gets an email from BDSMLR with a link to join the
                  account site.
                </p>
                <Show
                  when={data()?.allowed}
                  fallback={
                    <Alert variant="warning">
                      <AlertDescription>
                        {data()?.blockedMessage ||
                          "You are not allowed to send invitations from this account."}
                      </AlertDescription>
                    </Alert>
                  }
                >
                  <form class="flex flex-col gap-3" onSubmit={submitInvite}>
                    <TextField value={inviteEmail()} onChange={setInviteEmail}>
                      <TextFieldLabel>Email</TextFieldLabel>
                      <TextFieldInput
                        type="email"
                        autocomplete="off"
                        class="h-11 md:h-9"
                        placeholder="friend@example.com"
                        required
                      />
                    </TextField>
                    <TextField
                      value={inviteMessage()}
                      onChange={setInviteMessage}
                    >
                      <TextFieldLabel>Message (optional)</TextFieldLabel>
                      <TextFieldTextArea
                        rows={3}
                        placeholder="Add a personal note to the invitation"
                      />
                    </TextField>
                    <Button
                      type="submit"
                      class="h-11 md:h-9 w-full sm:w-auto sm:self-start"
                      disabled={
                        sending() || busy() !== "" || !inviteEmail().trim()
                      }
                    >
                      {sending() ? "Sending…" : "Send invite"}
                    </Button>
                  </form>
                </Show>
              </CardContent>
            </Card>

            <Card class="mb-3 gap-0 py-0">
              <CardHeader class="gap-1 px-4 py-4">
                <CardTitle>Invitations</CardTitle>
                <p class="text-xs text-muted-foreground">
                  {pendingInvitations().length} pending,{" "}
                  {acceptedInvitations().length} accepted on this page
                </p>
              </CardHeader>

              <Show when={selected().size > 0}>
                <div class="flex flex-wrap items-center gap-2 border-t border-border bg-muted/50 px-3 py-2">
                  <span class="text-sm font-medium">{selected().size} selected</span>
                  <div class="flex flex-wrap items-center gap-2 sm:ml-auto">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      class="h-11 md:h-9"
                      disabled={busy() !== "" || sending()}
                      onClick={bulkResend}
                    >
                      Resend selected
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      class="h-11 md:h-9 text-destructive hover:text-destructive"
                      disabled={busy() !== "" || sending()}
                      onClick={bulkCancel}
                    >
                      Cancel selected
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      class="h-11 md:h-9"
                      disabled={busy() !== "" || sending()}
                      onClick={clearSelection}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </Show>

              <Show
                when={invitations().length > 0}
                fallback={<EmptyState>No invitations yet.</EmptyState>}
              >
                <div class="border-t border-border px-3 py-2">
                  <Checkbox
                    class="flex min-h-11 items-center gap-3"
                    checked={allSelected()}
                    onChange={toggleSelectAll}
                  >
                    <CheckboxControl class="size-5" />
                    <CheckboxLabel class="text-sm font-normal">
                      Select all on this page
                    </CheckboxLabel>
                  </Checkbox>
                </div>
                <CardContent class="divide-y divide-border border-t border-border px-0 py-0">
                  <For each={invitations()}>
                    {(invitation) => (
                      <article class="flex gap-2 px-3 py-3">
                        <Checkbox
                          class="flex min-h-11 shrink-0 items-start pt-0.5"
                          checked={selected().has(invitation.id)}
                          onChange={() => toggleSelect(invitation.id)}
                        >
                          <CheckboxControl class="size-5" />
                          <CheckboxLabel class="sr-only">
                            Select the invitation for {invitation.email}
                          </CheckboxLabel>
                        </Checkbox>
                        <div class="flex min-w-0 flex-1 flex-col gap-1">
                          <div class="flex flex-wrap items-start justify-between gap-2">
                            <span class="min-w-0 break-all text-sm font-medium">
                              {invitation.email}
                            </span>
                            <Badge variant={statusVariant(invitation)}>
                              {statusLabel(invitation)}
                            </Badge>
                          </div>
                          <Show when={invitation.message}>
                            <p class="text-sm text-muted-foreground">
                              {invitation.message}
                            </p>
                          </Show>
                          <p class="text-xs text-muted-foreground">
                            <Show
                              when={invitation.dateModified}
                              fallback="No date recorded"
                            >
                              <span title={invitation.dateModified}>
                                {friendlyDate(invitation.dateModified)}
                              </span>
                            </Show>
                          </p>
                          <div class="mt-1 flex flex-wrap gap-2">
                            <Show when={!invitation.accepted}>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                class="h-11 md:h-9"
                                disabled={busy() !== "" || sending()}
                                onClick={() =>
                                  void runAction("resend", [invitation.id])
                                }
                              >
                                {busy() === `resend:${invitation.id}`
                                  ? "Resending…"
                                  : "Resend"}
                              </Button>
                            </Show>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              class="h-11 md:h-9 text-destructive hover:text-destructive"
                              disabled={busy() !== "" || sending()}
                              onClick={() =>
                                void runAction(
                                  "cancel",
                                  [invitation.id],
                                  invitation.accepted
                                    ? "Delete this accepted invitation record?"
                                    : "Cancel this invitation? The invite link will stop working.",
                                  invitation.accepted
                                    ? "Invitation record deleted."
                                    : undefined,
                                  invitation.accepted ? "Delete" : "Cancel",
                                )
                              }
                            >
                              {busy() === `cancel:${invitation.id}`
                                ? invitation.accepted
                                  ? "Deleting…"
                                  : "Canceling…"
                                : invitation.accepted
                                  ? "Delete"
                                  : "Cancel"}
                            </Button>
                          </div>
                        </div>
                      </article>
                    )}
                  </For>
                </CardContent>
                <div class="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    class="h-11 md:h-9"
                    disabled={loading() || page() <= 1}
                    onClick={() => void loadInvitations(page() - 1, notificationsPage())}
                  >
                    Previous page
                  </Button>
                  <span class="text-sm text-muted-foreground">
                    Page {page()}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    class="h-11 md:h-9"
                    disabled={loading() || !data()?.nextPage}
                    onClick={() => {
                      const next = data()?.nextPage;
                      if (next) void loadInvitations(next, notificationsPage());
                    }}
                  >
                    Next page
                  </Button>
                </div>
              </Show>
            </Card>

            <Card class="gap-0 py-0">
              <CardHeader class="gap-1 px-4 py-4">
                <CardTitle>Accepted invitations</CardTitle>
                <p class="text-xs text-muted-foreground">
                  {notifications().length} on this page
                </p>
              </CardHeader>
              <Show when={data()?.notificationsError}>
                <div class="px-4 pb-3">
                  <Alert variant="destructive">
                    <AlertDescription>
                      {data()?.notificationsError}
                    </AlertDescription>
                  </Alert>
                </div>
              </Show>
              <Show
                when={notifications().length > 0}
                fallback={
                  <EmptyState>
                    No accepted invitations yet. When someone joins, they show
                    up here with a link to their profile.
                  </EmptyState>
                }
              >
                <CardContent class="divide-y divide-border border-t border-border px-0 py-0">
                  <For each={notifications()}>
                    {(item: AcceptedInvitation) => (
                      <article class="flex flex-wrap items-center gap-3 px-4 py-3">
                        <div
                          class="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium"
                          aria-hidden="true"
                        >
                          {item.displayName[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div class="min-w-0 flex-1">
                          <A
                            href={`/${encodeURIComponent(item.userLogin)}`}
                            class="text-sm font-medium text-primary underline-offset-4 hover:underline"
                          >
                            {item.displayName}
                          </A>
                          <p class="text-xs text-muted-foreground">
                            Accepted an invitation
                            <Show when={item.timeSince}>
                              <span title={item.dateTitle}>
                                {" · "}
                                {item.timeSince}
                              </span>
                            </Show>
                          </p>
                        </div>
                        <a
                          href={item.accountProfileUrl}
                          class={buttonVariants({
                            variant: "outline",
                            size: "sm",
                            class: "h-11 md:h-9",
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Account profile
                        </a>
                      </article>
                    )}
                  </For>
                </CardContent>
                <div class="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    class="h-11 md:h-9"
                    disabled={loadingNotifications() || notificationsPage() <= 1}
                    onClick={() =>
                      void loadNotifications(notificationsPage() - 1)
                    }
                  >
                    Previous page
                  </Button>
                  <span class="text-sm text-muted-foreground">
                    Page {notificationsPage()}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    class="h-11 md:h-9"
                    disabled={
                      loadingNotifications() || !data()?.notificationsNextPage
                    }
                    onClick={() => {
                      const next = data()?.notificationsNextPage;
                      if (next) void loadNotifications(next);
                    }}
                  >
                    Next page
                  </Button>
                </div>
              </Show>
            </Card>
          </Show>
        </Show>

        <AlertDialog
          open={confirmOpen()}
          onOpenChange={(open) => setConfirmOpen(open)}
        >
          <AlertDialogPortal>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm action</AlertDialogTitle>
                <AlertDialogDescription>
                  {confirmRequest()?.text}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Go back</AlertDialogCancel>
                <AlertDialogAction
                  class={cx(
                    confirmRequest()?.destructive &&
                      "bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive/60",
                  )}
                  onClick={() => confirmRequest()?.run()}
                >
                  {confirmRequest()?.confirmLabel ?? "Confirm"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogPortal>
        </AlertDialog>
      </Page>
    </Show>
  );
}
