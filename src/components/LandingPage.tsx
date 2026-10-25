import { For, Show } from "solid-js";
import { A } from "@solidjs/router";
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
              BDSMLR,
              <br />
              <span class="landing-accent">a fresh view.</span>
            </h1>
            <p class="landing-lede">
              A fast, clean browser client for your feed, search, likes,
              reblogs, comments, and messages. It is a community project made
              by people who use BDSMLR every day. Sign in with your BDSMLR
              account and pick up where you left off.
            </p>
            <p class="landing-dig">
              The goal is a focused, comfortable place to browse, and a project
              the BDSMLR community can help shape.
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
              Built for daily browsing, with your feed, search, and messages
              close at hand.
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
              This site is built and maintained with OpenCode, primarily using
              DeepSeek V4.1 Flash. Here is the running tally from this
              repository's local session logs as of {AI_COST.asOf}.
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
                This is a community project, and it is meant to support the
                site rather than compete with it. If you like what you see,
                reach out on Discord. I would be glad to help the BDSMLR team in
                a professional capacity, whether that means improving the
                official site or finding another way to work together.
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
