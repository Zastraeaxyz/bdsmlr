import { A, useNavigate } from "@solidjs/router";
import { createEffect, For, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import Header from "~/components/Header";
import { useAuth } from "~/lib/useAuth";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, loading, blogs, activeBlog } = useAuth();

  createEffect(() => {
    if (!loading() && !user()) navigate("/login", { replace: true });
  });

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
            Account and blog customization are still edited on BDSMLR. This page
            shows your current account information and shortcuts.
          </p>
        </main>
      </div>
    </Show>
  );
}
