import { A, useNavigate } from "@solidjs/router";
import { createEffect, createSignal, For, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import Header from "~/components/Header";
import { useAuth } from "~/lib/useAuth";
import {
  changeLegacyBlogName,
  changeLegacyEmail,
  changeLegacyPassword,
  LegacyError,
} from "~/lib/legacy";

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
      setNotice(success);
    } catch (err: unknown) {
      setError(
        err instanceof LegacyError && err.status === 429
          ? "BDSMLR temporarily blocked the request. Wait a moment and try again."
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
      <Title>Settings - bbdsmlr</Title>
      <div class="home-page">
        <Header info="Settings" />
        <main>
          <section class="settings-section">
            <h2 class="social-list-title">Account</h2>
            <div class="settings-facts">
              <div>
                <span>Username</span>
                <strong>@{user()!.username || user()!.blog_name}</strong>
              </div>
              <Show when={user()!.email}>
                <div>
                  <span>Email</span>
                  <strong>{user()!.email}</strong>
                </div>
              </Show>
              <div>
                <span>Active blog</span>
                <strong>@{activeBlog()?.name ?? user()!.blog_name}</strong>
              </div>
            </div>
          </section>

          <section class="settings-section">
            <h2 class="social-list-title">Account changes</h2>
            <Show when={error()}>
              <p class="error">{error()}</p>
            </Show>
            <Show when={notice()}>
              <p class="action-notice">{notice()}</p>
            </Show>
            <form class="settings-form" onSubmit={submitEmail}>
              <label>
                <span>Change email</span>
                <input
                  type="email"
                  placeholder={user()!.email || "new@example.com"}
                  value={newEmail()}
                  onInput={(e) => setNewEmail(e.currentTarget.value)}
                />
              </label>
              <button type="submit" disabled={!newEmail().trim() || busy() !== ""}>
                {busy() === "email" ? "Saving…" : "Change email"}
              </button>
            </form>
            <form class="settings-form" onSubmit={submitPassword}>
              <label>
                <span>New password</span>
                <input
                  type="password"
                  value={newPassword()}
                  onInput={(e) => setNewPassword(e.currentTarget.value)}
                />
              </label>
              <label>
                <span>Confirm password</span>
                <input
                  type="password"
                  value={confirmPassword()}
                  onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                />
              </label>
              <button
                type="submit"
                disabled={!newPassword() || !confirmPassword() || busy() !== ""}
              >
                {busy() === "password" ? "Saving…" : "Change password"}
              </button>
            </form>
            <form class="settings-form" onSubmit={submitBlogName}>
              <label>
                <span>Change blog name</span>
                <input
                  type="text"
                  placeholder={activeBlog()?.name || "blogname"}
                  value={newBlogName()}
                  onInput={(e) => setNewBlogName(e.currentTarget.value)}
                />
              </label>
              <button
                type="submit"
                disabled={!newBlogName().trim() || busy() !== ""}
              >
                {busy() === "blogname" ? "Saving…" : "Change blog name"}
              </button>
            </form>
          </section>

          <section class="settings-section">
            <h2 class="social-list-title">Your blogs</h2>
            <div class="settings-links">
              <For each={blogs()}>
                {(blog) => (
                  <A href={`/${blog.name}`} class="settings-link">
                    @{blog.name}
                  </A>
                )}
              </For>
            </div>
          </section>

          <section class="settings-section">
            <h2 class="social-list-title">More</h2>
            <div class="settings-links">
              <A href="/customize" class="settings-link">
                Customize blog
              </A>
              <A href="/blocked" class="settings-link">
                Blocked blogs
              </A>
              <A href="/compose" class="settings-link">
                Compose post
              </A>
              <a
                href="https://bdsmlr.com/settings"
                target="_blank"
                rel="noopener noreferrer"
                class="settings-link"
              >
                BDSMLR settings
              </a>
              <a
                href="https://bdsmlr.com/queuev2"
                target="_blank"
                rel="noopener noreferrer"
                class="settings-link"
              >
                BDSMLR queue
              </a>
              <a
                href="https://bdsmlr.com/drafts"
                target="_blank"
                rel="noopener noreferrer"
                class="settings-link"
              >
                BDSMLR drafts
              </a>
              <a
                href="https://bdsmlr.com/asks"
                target="_blank"
                rel="noopener noreferrer"
                class="settings-link"
              >
                BDSMLR asks
              </a>
            </div>
          </section>

          <p class="compose-note">
            Most account settings are available here. Some advanced blog
            options, asks, and queue management still live on BDSMLR.
          </p>
        </main>
      </div>
    </Show>
  );
}
