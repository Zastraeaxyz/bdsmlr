import { For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { useAuth } from "~/lib/useAuth";
import { trackEvent } from "~/lib/analytics";
import { DiscordIcon, GitHubIcon } from "~/components/Icons";
import { AgeGate } from "~/components/AgeGate";
import OutageBanner from "~/components/OutageBanner";
import RateLimitBanner from "~/components/RateLimitBanner";
import { DISCORD_URL, REPO_URL } from "~/lib/links";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

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

  const cta = (target: string, location: string) => () =>
    trackEvent("cta-click", { target, location });

  return (
    <div class="flex min-h-dvh flex-col bg-background">
      <Title>Better BDSMLR</Title>
      <AgeGate />

      <header class="safe-top sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <A href="/" class="flex items-center gap-2.5 font-bold tracking-tight">
            <span class="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-extrabold tracking-tighter text-primary-foreground">
              BB
            </span>
            <span class="text-base">Better BDSMLR</span>
          </A>
          <nav class="flex items-center gap-1">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              class="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
              onClick={cta("github", "nav")}
            >
              GitHub
            </a>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              class="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
              onClick={cta("discord", "nav")}
            >
              Discord
            </a>
            <A
              href="/about"
              class="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
            >
              About
            </A>
            <Show
              when={user()}
              fallback={
                <Button
                  as={A}
                  href="/login"
                  size="sm"
                  class="ml-1 h-10 px-4"
                  onClick={cta("login", "nav")}
                >
                  Log in
                </Button>
              }
            >
              <Button
                as={A}
                href="/home"
                size="sm"
                class="ml-1 h-10 px-4"
                onClick={cta("feed", "nav")}
              >
                Open feed
              </Button>
            </Show>
          </nav>
        </div>
      </header>

      <OutageBanner />
      <RateLimitBanner />

      <main class="mx-auto w-full max-w-6xl px-4">
        <section class="grid gap-10 py-10 sm:py-14 lg:grid-cols-2 lg:items-center lg:gap-14 lg:py-20">
          <div class="min-w-0">
            <Badge
              variant="outline"
              class="border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary"
            >
              Intuitive and modern UI
            </Badge>
            <h1 class="mt-4 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              BDSMLR,
              <br />
              <span class="text-primary">a fresh view.</span>
            </h1>
            <p class="mt-4 max-w-prose text-base leading-relaxed text-muted-foreground sm:text-lg">
              A fast, clean browser client for your feed, search, likes,
              reblogs, comments, and messages. It is an open source community
              project made by people who use BDSMLR every day. Sign in with your
              BDSMLR account and pick up where you left off.
            </p>
            <p class="mt-4 max-w-prose border-l-2 border-primary pl-3.5 text-sm leading-relaxed">
              The goal is a focused, comfortable place to browse, and the code
              is now public on GitHub so the BDSMLR community can help build it.
            </p>
            <div class="mt-6 flex flex-wrap gap-3">
              <Show
                when={user()}
                fallback={
                  <Button
                    as={A}
                    href="/login"
                    size="lg"
                    class="h-11 px-6"
                    onClick={cta("login", "hero")}
                  >
                    Log in
                  </Button>
                }
              >
                <Button
                  as={A}
                  href="/home"
                  size="lg"
                  class="h-11 px-6"
                  onClick={cta("feed", "hero")}
                >
                  Open feed
                </Button>
              </Show>
              <Button
                as="a"
                href="#features"
                variant="outline"
                size="lg"
                class="h-11 px-6"
                onClick={cta("features", "hero")}
              >
                See features
              </Button>
              <Button
                as="a"
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                size="lg"
                class="h-11 gap-2 px-6"
                onClick={cta("discord", "hero")}
              >
                <DiscordIcon class="size-4" />
                Discord community
              </Button>
            </div>
            <Show when={user() && activeBlog()}>
              <p class="mt-4 text-sm text-muted-foreground">
                Signed in as @{activeBlog()!.name}
              </p>
            </Show>
          </div>
          <div class="min-w-0">
            <img
              src="/previews/hero-account.png"
              alt="The Better BDSMLR Following feed while signed in"
              class="block w-full rounded-xl border border-border shadow-2xl"
            />
          </div>
        </section>

        <section
          class="scroll-mt-20 border-t border-border py-12 sm:py-16"
          id="features"
        >
          <div class="mb-6 max-w-2xl">
            <span class="text-xs font-bold uppercase tracking-wider text-primary">
              Features
            </span>
            <h2 class="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Everything you use, in one place
            </h2>
            <p class="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Built for daily browsing, with your feed, search, and messages
              close at hand.
            </p>
          </div>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <For each={FEATURES}>
              {(feature) => (
                <Card class="gap-2 p-5">
                  <h3 class="text-base font-semibold">{feature.title}</h3>
                  <p class="text-sm leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                </Card>
              )}
            </For>
          </div>
        </section>

        <section class="border-t border-border py-12 sm:py-16">
          <div class="mb-6 max-w-2xl">
            <span class="text-xs font-bold uppercase tracking-wider text-primary">
              Open source
            </span>
            <h2 class="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Built in the open
            </h2>
            <p class="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Every part of this app is public. Read how it handles your
              session, run your own copy, or help fix the parts of BDSMLR that
              break.
            </p>
          </div>
          <Card class="gap-6 border-primary/20 bg-primary/5 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
            <div class="min-w-0">
              <h2 class="text-xl font-bold tracking-tight sm:text-2xl">
                Better BDSMLR on GitHub
              </h2>
              <p class="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
                Bugs, feature ideas, and pull requests all live in the
                repository. The issue tracker is the fastest way to reach the
                project, and the Discord community is a good place to ask too.
              </p>
            </div>
            <Button
              as="a"
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              class="h-11 shrink-0 gap-2 px-6"
              onClick={cta("github", "open-source")}
            >
              <GitHubIcon class="size-4" />
              View the repository
            </Button>
          </Card>
        </section>

        <section class="border-t border-border py-12 sm:py-16">
          <div class="mb-6 max-w-2xl">
            <span class="text-xs font-bold uppercase tracking-wider text-primary">
              AI spend
            </span>
            <h2 class="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Built with AI, and honest about it
            </h2>
            <p class="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              This site is built and maintained with OpenCode, primarily using
              DeepSeek V4.1 Flash. Here is the running tally from this
              repository's local session logs as of {AI_COST.asOf}.
            </p>
          </div>
          <div class="mb-6 grid grid-cols-2 gap-3 sm:max-w-md">
            <Card class="gap-1 p-5">
              <span class="text-3xl font-extrabold tracking-tight">
                ${AI_COST.total.toFixed(2)}
              </span>
              <span class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Total AI spend
              </span>
            </Card>
            <Card class="gap-1 p-5">
              <span class="text-3xl font-extrabold tracking-tight">
                {AI_COST.sessions}
              </span>
              <span class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                OpenCode sessions
              </span>
            </Card>
          </div>
          <p class="text-xs text-muted-foreground">
            Costs come from local OpenCode session records and will change as
            work continues.
          </p>
        </section>

        <section class="border-t border-border pb-7 pt-12 sm:pt-16">
          <div class="mb-6 max-w-2xl">
            <span class="text-xs font-bold uppercase tracking-wider text-primary">
              Share previews
            </span>
            <h2 class="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Links that look good everywhere
            </h2>
            <p class="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Share a profile or post on Discord or X and get a rich preview
              with the blog avatar, description, and the post's first image.
              This works for reblogs too.
            </p>
          </div>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <For each={PREVIEWS}>
              {(preview) => (
                <Card class="gap-0 overflow-hidden p-0">
                  <figure class="m-0">
                    <img
                      src={preview.src}
                      alt={preview.label}
                      loading="lazy"
                      class="block aspect-[3/2] w-full border-b border-border object-cover"
                    />
                    <figcaption class="flex flex-col gap-1 p-3.5">
                      <strong class="text-xs font-semibold text-card-foreground">
                        {preview.label}
                      </strong>
                      <span class="text-xs leading-snug text-muted-foreground">
                        {preview.caption}
                      </span>
                    </figcaption>
                  </figure>
                </Card>
              )}
            </For>
          </div>
          <p class="mt-4 text-xs text-muted-foreground">
            Discord and X both read the same Open Graph and Twitter metadata.
            No extra setup is needed.
          </p>
        </section>

        <section class="border-t border-border py-12 sm:py-16">
          <Card class="gap-6 border-primary/20 bg-primary/5 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
            <div class="min-w-0">
              <span class="text-xs font-bold uppercase tracking-wider text-primary">
                For the BDSMLR team
              </span>
              <h2 class="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                Own BDSMLR?
              </h2>
              <p class="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
                This is an open source community project, and it is meant to
                support the site rather than compete with it. If you like what
                you see, reach out on Discord. I would be glad to help the
                BDSMLR team in a professional capacity, whether that means
                improving the official site or finding another way to work
                together.
              </p>
            </div>
            <Button
              as="a"
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              class="h-11 shrink-0 gap-2 px-6"
              onClick={cta("discord", "contact")}
            >
              <DiscordIcon class="size-4" />
              Message me on Discord
            </Button>
          </Card>
        </section>
      </main>

      <footer class="border-t border-border">
        <div class="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Better BDSMLR, an open source community project</span>
          <nav class="flex flex-wrap items-center gap-x-4 gap-y-2">
            <A
              href="/about"
              class="transition-colors hover:text-foreground"
            >
              About the backend
            </A>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              class="transition-colors hover:text-foreground"
              onClick={cta("github", "footer")}
            >
              GitHub
            </a>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              class="transition-colors hover:text-foreground"
              onClick={cta("discord", "footer")}
            >
              Discord
            </a>
            <Show
              when={user()}
              fallback={
                <A
                  href="/login"
                  class="transition-colors hover:text-foreground"
                  onClick={cta("login", "footer")}
                >
                  Log in
                </A>
              }
            >
              <A
                href="/home"
                class="transition-colors hover:text-foreground"
                onClick={cta("feed", "footer")}
              >
                Open feed
              </A>
            </Show>
          </nav>
        </div>
      </footer>
    </div>
  );
}
