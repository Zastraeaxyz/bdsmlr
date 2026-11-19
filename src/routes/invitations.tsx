import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Show,
} from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import Header from "~/components/Header";
import { useAuth } from "~/lib/useAuth";
import { trackEvent } from "~/lib/analytics";
import {
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

function statusClass(invitation: Invitation): string {
  if (invitation.accepted) return "accepted";
  if (!invitation.sent) return "unsent";
  return "pending";
}

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
      setSession(result.session);
      setSelected(new Set<string>());
      if (result.session.userLogin) setUsernameInput(result.session.userLogin);
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

  const submitConnect = async (e: Event) => {
    e.preventDefault();
    if (authBusy()) return;
    const cookie = cookieInput().trim();
    if (!cookie) {
      setError("Paste the account-site session cookie first.");
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

  const handleDisconnect = async () => {
    if (
      !window.confirm(
        "Disconnect the account site? You will need to connect it again to use invitations.",
      )
    ) {
      return;
    }
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

  const runAction = async (
    action: "resend" | "cancel",
    ids: string[],
    confirmText?: string,
    successText?: string,
  ) => {
    if (busy() || sending() || ids.length === 0) return;
    if (confirmText && !window.confirm(confirmText)) return;
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
      <Title>Invitations - bbdsmlr</Title>
      <div class="home-page invitations-page">
        <Header info="Invitations" />
        <main class="invitations-main">
          <Show when={checking()}>
            <p class="loading">Checking the account site…</p>
          </Show>

          <Show when={!checking() && !session()?.connected}>
            <section class="invitations-connect">
              <h2>Invitations need the account site</h2>
              <p class="invitations-connect-copy">
                Invitations live on{" "}
                <a
                  href="https://account.bdsmlr.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  account.bdsmlr.com
                </a>
                , a separate WordPress and BuddyPress site. Your bbdsmlr
                sign-in does not carry over, and the account site protects its
                login with Cloudflare Turnstile. The account-site password is
                only used for the sign-in attempt and is never stored.
              </p>
              <Show when={session()?.expired}>
                <p class="invitations-warning">
                  Your account-site session expired. Connect it again to keep
                  managing invitations.
                </p>
              </Show>
              <Show when={session()?.loginBlocked}>
                <p class="invitations-warning">
                  The account site currently asks for a browser check. If the
                  sign-in form does not work, connect an existing session
                  instead.
                </p>
              </Show>
              <Show when={error()}>
                <p class="error">{error()}</p>
              </Show>
              <Show when={notice()}>
                <p class="action-notice">{notice()}</p>
              </Show>

              <div class="invitations-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode() === "login"}
                  class={mode() === "login" ? "invitations-tab active" : "invitations-tab"}
                  onClick={() => {
                    setMode("login");
                    setError("");
                    setNotice("");
                  }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode() === "session"}
                  class={mode() === "session" ? "invitations-tab active" : "invitations-tab"}
                  onClick={() => {
                    setMode("session");
                    setError("");
                    setNotice("");
                  }}
                >
                  Use an existing session
                </button>
              </div>

              <Show when={mode() === "login"}>
                <form class="invitations-connect-form" onSubmit={submitLogin}>
                  <label class="compose-field">
                    BDSMLR email or username
                    <input
                      type="text"
                      autocomplete="username"
                      value={email()}
                      onInput={(e) => setEmail(e.currentTarget.value)}
                      required
                    />
                  </label>
                  <label class="compose-field">
                    BDSMLR password
                    <input
                      type="password"
                      autocomplete="current-password"
                      value={password()}
                      onInput={(e) => setPassword(e.currentTarget.value)}
                      required
                    />
                  </label>
                  <button type="submit" disabled={authBusy()}>
                    {authBusy() ? "Signing in…" : "Sign in to the account site"}
                  </button>
                </form>
              </Show>

              <Show when={mode() === "session"}>
                <form class="invitations-connect-form" onSubmit={submitConnect}>
                  <p class="invitations-connect-copy">
                    Sign in at{" "}
                    <a
                      href="https://account.bdsmlr.com/wp-login.php"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      account.bdsmlr.com
                    </a>
                    , then paste the account-site session cookie here. It is
                    stored only in an HTTP-only cookie on this device and can
                    be disconnected at any time.
                  </p>
                  <label class="compose-field">
                    Account-site username
                    <input
                      type="text"
                      autocomplete="off"
                      value={usernameInput()}
                      onInput={(e) => setUsernameInput(e.currentTarget.value)}
                      placeholder="Your account-site username"
                    />
                  </label>
                  <label class="compose-field">
                    Session cookie
                    <textarea
                      rows={4}
                      autocomplete="off"
                      spellcheck={false}
                      value={cookieInput()}
                      onInput={(e) => setCookieInput(e.currentTarget.value)}
                      placeholder="wordpress_logged_in_...=..."
                    />
                  </label>
                  <details class="invitations-help">
                    <summary>How to get the session cookie</summary>
                    <ol>
                      <li>
                        Open{" "}
                        <a
                          href="https://account.bdsmlr.com/wp-login.php"
                          target="_blank"
                          rel="noopener noreferrer"
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
                        <code> wordpress_logged_in_…</code>, starting with
                        <code> wordpress_logged_in_…=</code>.
                      </li>
                      <li>Paste it above and connect.</li>
                    </ol>
                    <p>
                      If you prefer, copy the whole Cookie request header from
                      the Network tab. Paste it as one line.
                    </p>
                  </details>
                  <button type="submit" disabled={authBusy()}>
                    {authBusy() ? "Connecting…" : "Connect account site"}
                  </button>
                </form>
              </Show>
            </section>
          </Show>

          <Show when={!checking() && session()?.connected}>
            <Show when={error()}>
              <p class="error invitations-error">{error()}</p>
            </Show>
            <Show when={notice()}>
              <p class="action-notice invitations-notice">{notice()}</p>
            </Show>

            <section class="invitations-summary">
              <div>
                <p class="invitations-summary-title">
                  Connected as {session()?.userLogin}
                </p>
                <p class="invitations-summary-meta">
                  Invitations are managed on account.bdsmlr.com.
                </p>
              </div>
              <div class="invitations-summary-actions">
                <button
                  type="button"
                  class="btn-ghost"
                  disabled={loading()}
                  onClick={() => {
                    setError("");
                    setNotice("");
                    void loadInvitations(page(), notificationsPage());
                  }}
                >
                  {loading() ? "Refreshing…" : "Refresh"}
                </button>
                <button
                  type="button"
                  class="btn-ghost danger-text"
                  onClick={() => void handleDisconnect()}
                >
                  Disconnect
                </button>
              </div>
            </section>

            <Show
              when={data()}
              fallback={
                <p class={loading() ? "loading" : "empty"}>
                  {loading()
                    ? "Loading invitations…"
                    : "Invitations could not be loaded."}
                </p>
              }
            >
            <section class="compose-card invitations-send">
              <h2>Send an invite</h2>
              <p class="invitations-send-note">
                The invitee gets an email from BDSMLR with a link to join the
                account site.
              </p>
              <Show
                when={data()?.allowed}
                fallback={
                  <p class="invitations-warning">
                    {data()?.blockedMessage ||
                      "You are not allowed to send invitations from this account."}
                  </p>
                }
              >
                <form class="invitations-send-form" onSubmit={submitInvite}>
                  <label class="compose-field">
                    Email
                    <input
                      type="email"
                      autocomplete="off"
                      placeholder="friend@example.com"
                      value={inviteEmail()}
                      onInput={(e) => setInviteEmail(e.currentTarget.value)}
                      required
                    />
                  </label>
                  <label class="compose-field">
                    Message (optional)
                    <textarea
                      rows={3}
                      placeholder="Add a personal note to the invitation"
                      value={inviteMessage()}
                      onInput={(e) => setInviteMessage(e.currentTarget.value)}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={
                      sending() || busy() !== "" || !inviteEmail().trim()
                    }
                  >
                    {sending() ? "Sending…" : "Send invite"}
                  </button>
                </form>
              </Show>
            </section>

            <section class="invitations-section">
              <div class="invitations-section-header">
                <h2>Invitations</h2>
                <span class="invitations-section-count">
                  {pendingInvitations().length} pending,{" "}
                  {acceptedInvitations().length} accepted on this page
                </span>
              </div>

              <Show when={selected().size > 0}>
                <div class="invitations-bulk">
                  <span>{selected().size} selected</span>
                  <button
                    type="button"
                    class="btn-ghost"
                    disabled={busy() !== "" || sending()}
                    onClick={bulkResend}
                  >
                    Resend selected
                  </button>
                  <button
                    type="button"
                    class="btn-ghost danger-text"
                    disabled={busy() !== "" || sending()}
                    onClick={bulkCancel}
                  >
                    Cancel selected
                  </button>
                  <button
                    type="button"
                    class="btn-ghost"
                    disabled={busy() !== "" || sending()}
                    onClick={clearSelection}
                  >
                    Clear
                  </button>
                </div>
              </Show>

              <Show
                when={invitations().length > 0}
                fallback={<p class="empty">No invitations yet.</p>}
              >
                <label class="invitations-select-all">
                  <input
                    type="checkbox"
                    checked={allSelected()}
                    onChange={toggleSelectAll}
                  />
                  Select all on this page
                </label>
                <div class="invitations-list">
                  <For each={invitations()}>
                    {(invitation) => (
                      <article class="invitation-card">
                        <label class="invitation-select">
                          <input
                            type="checkbox"
                            checked={selected().has(invitation.id)}
                            onChange={() => toggleSelect(invitation.id)}
                          />
                          <span class="visually-hidden">
                            Select the invitation for {invitation.email}
                          </span>
                        </label>
                        <div class="invitation-body">
                          <div class="invitation-top">
                            <span class="invitation-email">
                              {invitation.email}
                            </span>
                            <span
                              class={`invitation-status ${statusClass(invitation)}`}
                            >
                              {statusLabel(invitation)}
                            </span>
                          </div>
                          <Show when={invitation.message}>
                            <p class="invitation-message">
                              {invitation.message}
                            </p>
                          </Show>
                          <p class="invitation-meta">
                            <Show
                              when={invitation.dateModified}
                              fallback="No date recorded"
                            >
                              <span title={invitation.dateModified}>
                                {friendlyDate(invitation.dateModified)}
                              </span>
                            </Show>
                          </p>
                          <div class="invitation-actions">
                            <Show when={!invitation.accepted}>
                              <button
                                type="button"
                                class="btn-ghost"
                                disabled={busy() !== "" || sending()}
                                onClick={() =>
                                  void runAction("resend", [invitation.id])
                                }
                              >
                                {busy() === `resend:${invitation.id}`
                                  ? "Resending…"
                                  : "Resend"}
                              </button>
                            </Show>
                            <button
                              type="button"
                              class="btn-ghost danger-text"
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
                            </button>
                          </div>
                        </div>
                      </article>
                    )}
                  </For>
                </div>
                <div class="invitations-pagination">
                  <button
                    type="button"
                    class="btn-ghost"
                    disabled={loading() || page() <= 1}
                    onClick={() => void loadInvitations(page() - 1, notificationsPage())}
                  >
                    Previous page
                  </button>
                  <span>Page {page()}</span>
                  <button
                    type="button"
                    class="btn-ghost"
                    disabled={loading() || !data()?.nextPage}
                    onClick={() => {
                      const next = data()?.nextPage;
                      if (next) void loadInvitations(next, notificationsPage());
                    }}
                  >
                    Next page
                  </button>
                </div>
              </Show>
            </section>

            <section class="invitations-section">
              <div class="invitations-section-header">
                <h2>Accepted invitations</h2>
                <span class="invitations-section-count">
                  {notifications().length} on this page
                </span>
              </div>
              <Show when={data()?.notificationsError}>
                <p class="error invitations-error">
                  {data()?.notificationsError}
                </p>
              </Show>
              <Show
                when={notifications().length > 0}
                fallback={
                  <p class="empty">
                    No accepted invitations yet. When someone joins, they show
                    up here with a link to their profile.
                  </p>
                }
              >
                <div class="accepted-invites">
                  <For each={notifications()}>
                    {(item: AcceptedInvitation) => (
                      <article class="accepted-invite">
                        <div class="accepted-invite-avatar" aria-hidden="true">
                          {item.displayName[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div class="accepted-invite-body">
                          <A
                            href={`/${encodeURIComponent(item.userLogin)}`}
                            class="accepted-invite-name"
                          >
                            {item.displayName}
                          </A>
                          <p class="accepted-invite-meta">
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
                          class="btn-ghost"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Account profile
                        </a>
                      </article>
                    )}
                  </For>
                </div>
                <div class="invitations-pagination">
                  <button
                    type="button"
                    class="btn-ghost"
                    disabled={loadingNotifications() || notificationsPage() <= 1}
                    onClick={() =>
                      void loadNotifications(notificationsPage() - 1)
                    }
                  >
                    Previous page
                  </button>
                  <span>Page {notificationsPage()}</span>
                  <button
                    type="button"
                    class="btn-ghost"
                    disabled={
                      loadingNotifications() || !data()?.notificationsNextPage
                    }
                    onClick={() => {
                      const next = data()?.notificationsNextPage;
                      if (next) void loadNotifications(next);
                    }}
                  >
                    Next page
                  </button>
                </div>
              </Show>
            </section>
            </Show>
          </Show>
        </main>
      </div>
    </Show>
  );
}
