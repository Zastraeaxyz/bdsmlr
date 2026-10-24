import { createEffect, For, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { useAuth } from "~/lib/useAuth";
import { DiscordIcon } from "~/components/Icons";
import { AgeGate } from "~/components/AgeGate";

const FEATURES = [
  {
    title: "Following feed",
    body: "See new posts from the blogs you follow, with sorting, infinite scroll, and a clean list or grid view.",
  },
  {
    title: "Search and discovery",
    body: "Search posts and blogs, browse tags, and find new blogs to follow from profiles.",
  },
  {
    title: "Likes, reblogs, and comments",
    body: "Like posts, reblog with a note or tags, queue reblogs, and join conversations without leaving the app.",
  },
  {
    title: "Messages",
    body: "Read and send messages, share images, archive conversations, block senders, and see unread counts.",
  },
  {
    title: "Social controls",
    body: "Follow and unfollow blogs, view followers and sibling blogs, block or report blogs, and manage posts.",
  },
  {
    title: "RSS feeds",
    body: "Every profile has an RSS feed with media enclosures, so you can follow blogs from your reader.",
  },
];


const AI_COST = {
  total: 4.72,
  sessions: 9,
  asOf: "October 24, 2026",
  models: [
    {
      name: "DeepSeek V4.1 Flash",
      sessions: 6,
      share: 66.7,
      cost: 4.66,
    },
    {
      name: "DeepSeek V4 Flash",
      sessions: 3,
      share: 33.3,
      cost: 0.06,
    },
  ],
};

const PREVIEWS = [
  {
    src: "/previews/preview-site.png",
    label: "Site preview",
    caption: "A branded card for the home page.",
  },
  {
    src: "/previews/preview-profile.png",
    label: "Profile preview",
    caption: "The blog avatar and description appear in the card.",
  },
  {
    src: "/previews/preview-post.png",
    label: "Post preview",
    caption: "Posts show their first image, including reblogs.",
  },
];

export default function LandingPage() {
  const { user, activeBlog } = useAuth();
  const navigate = useNavigate();

  createEffect(() => {
    if (user()) navigate("/home", { replace: true });
  });

  return (
    <div class="landing-page">
      <Title>Better BDSMLR</Title>
      <AgeGate />
      <header class="landing-nav">
        <A href="/" class="landing-brand">
          <span class="landing-brand-mark">BB</span>
          <span>Better BDSMLR</span>
        </A>
        <nav class="landing-nav-links">
          <a
            href="https://discord.gg/w3BkPTwf2d"
            target="_blank"
            rel="noopener noreferrer"
            class="landing-nav-link"
          >
            Discord
          </a>
          <A href="/about" class="landing-nav-link">
            About
          </A>
          <Show
            when={user()}
            fallback={
              <A href="/login" class="landing-login">
                Log in
              </A>
            }
          >
            <A href="/home" class="landing-login">
              Open feed
            </A>
          </Show>
        </nav>
      </header>

      <main class="landing-main">
        <section class="landing-hero">
          <div class="landing-hero-copy">
            <span class="landing-eyebrow">Intuitive and modern UI</span>
            <h1>
              Browse BDSMLR,
              <br />
              <span class="landing-accent">without the noise.</span>
            </h1>
            <p class="landing-lede">
              A fast, clean browser client for your feed, search, likes,
              reblogs, comments, and messages. Built by a senior developer with
              an eye for design and detail. Sign in with your BDSMLR account
              and pick up where you left off.
            </p>
            <p class="landing-dig">
              The official frontend feels cluttered by comparison, with less
              attention to design and detail.
            </p>
            <div class="landing-actions">
              <Show
                when={user()}
                fallback={
                  <A href="/login" class="landing-cta">
                    Log in
                  </A>
                }
              >
                <A href="/home" class="landing-cta">
                  Open feed
                </A>
              </Show>
              <A href="#features" class="landing-secondary">
                See features
              </A>
              <a
                href="https://discord.gg/w3BkPTwf2d"
                target="_blank"
                rel="noopener noreferrer"
                class="landing-secondary landing-discord"
              >
                <DiscordIcon class="icon" />
                Discord community
              </a>
            </div>
            <Show when={user() && activeBlog()}>
              <p class="landing-signed-in">
                Signed in as @{activeBlog()!.name}
              </p>
            </Show>
          </div>
          <div class="landing-hero-visual">
            <img
              src="/previews/hero-account.png"
              alt="The Better BDSMLR Following feed while signed in"
            />
          </div>
        </section>

        <section class="landing-section" id="features">
          <div class="landing-section-head">
            <span class="landing-kicker">Features</span>
            <h2>Everything you use, in one place</h2>
            <p>
              Built for daily browsing. No extra tabs, no clutter, and no
              missing basics.
            </p>
          </div>
          <div class="landing-feature-grid">
            <For each={FEATURES}>
              {(feature) => (
                <article class="landing-feature">
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </article>
              )}
            </For>
          </div>
        </section>

        <section class="landing-section landing-ai">
          <div class="landing-section-head">
            <span class="landing-kicker">AI spend</span>
            <h2>Built with AI, and honest about it</h2>
            <p>
              This site is built and maintained with OpenCode. Here is the
              running tally from this repository's local session logs as of{" "}
              {AI_COST.asOf}.
            </p>
          </div>
          <div class="landing-ai-stats">
            <div class="landing-ai-stat">
              <span class="landing-ai-value">${AI_COST.total.toFixed(2)}</span>
              <span class="landing-ai-label">Total AI spend</span>
            </div>
            <div class="landing-ai-stat">
              <span class="landing-ai-value">{AI_COST.sessions}</span>
              <span class="landing-ai-label">OpenCode sessions</span>
            </div>
          </div>
          <div class="landing-ai-models">
            <h3>Models by session share</h3>
            <For each={AI_COST.models}>
              {(model) => (
                <div class="landing-ai-model">
                  <div class="landing-ai-model-head">
                    <span>{model.name}</span>
                    <span>{model.share}% of sessions</span>
                  </div>
                  <div class="landing-ai-bar">
                    <span style={{ width: `${model.share}%` }} />
                  </div>
                  <div class="landing-ai-model-meta">
                    {model.sessions} sessions · ${model.cost.toFixed(2)}
                  </div>
                </div>
              )}
            </For>
          </div>
          <p class="landing-ai-note">
            Costs come from local OpenCode session records and will change as
            work continues.
          </p>
        </section>

        <section class="landing-section landing-previews">
          <div class="landing-section-head">
            <span class="landing-kicker">Share previews</span>
            <h2>Links that look good everywhere</h2>
            <p>
              Share a profile or post on Discord or X and get a rich preview
              with the blog avatar, description, and the post's first image.
              This works for reblogs too.
            </p>
          </div>
          <div class="landing-preview-grid">
            <For each={PREVIEWS}>
              {(preview) => (
                <figure class="landing-preview">
                  <img src={preview.src} alt={preview.label} loading="lazy" />
                  <figcaption>
                    <strong>{preview.label}</strong>
                    <span>{preview.caption}</span>
                  </figcaption>
                </figure>
              )}
            </For>
          </div>
          <p class="landing-preview-note">
            Discord and X both read the same Open Graph and Twitter metadata.
            No extra setup is needed.
          </p>
        </section>

        <section class="landing-section landing-contact">
          <div class="landing-contact-card">
            <div>
              <span class="landing-kicker">For the BDSMLR team</span>
              <h2>Own BDSMLR?</h2>
              <p>
                If you like what you see here, reach out on Discord. I would be
                happy to help improve the official site.
              </p>
            </div>
            <a
              href="https://discord.gg/w3BkPTwf2d"
              target="_blank"
              rel="noopener noreferrer"
              class="landing-cta landing-contact-link"
            >
              <DiscordIcon class="icon" />
              Message me on Discord
            </a>
          </div>
        </section>
      </main>

      <footer class="landing-footer">
        <span>Better BDSMLR</span>
        <nav>
          <A href="/about">About the backend</A>
          <a
            href="https://discord.gg/w3BkPTwf2d"
            target="_blank"
            rel="noopener noreferrer"
          >
            Discord
          </a>
          <Show when={user()} fallback={<A href="/login">Log in</A>}>
            <A href="/home">Open feed</A>
          </Show>
        </nav>
      </footer>
    </div>
  );
}
