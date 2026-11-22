import { Title } from "@solidjs/meta";
import { For, onMount } from "solid-js";
import { Page, PageHeader } from "~/components/Page";
import { REPO_URL } from "~/lib/links";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";

interface FaqEntry {
  /** Stable anchor used for direct links to this question. */
  id: string;
  question: string;
  answer: string[];
}

const faqs: FaqEntry[] = [
  {
    id: "rss-feeds",
    question: "How do I configure an RSS feed?",
    answer: [
      "Every profile has a feed at /<blog>/rss on this site. Open that URL in a normal browser and you get a page where you can turn the feed options on and off and copy the finished URL. Feed readers still get plain XML.",
      "The options are include reblogs, hide repeating images (which removes images shared by the three newest image posts, for blogs like Rectrix), images only (which drops text-only and video-only posts and leaves the images), and open links in bbdsmlr (which points post, tag, and blog links at this app instead of bdsmlr.com). They are also URL parameters you can set by hand: include_reblogs=1, hide_repeating_images=1, images_only=1, and zastraea=true.",
      "Private blogs need your v2_session token in the feed URL so the reader can sign in. The feed page warns you when that token is present. Never share, post, or screenshot a URL that contains it: anyone who has it can use it to access your account.",
    ],
  },
  {
    id: "why-are-some-gifs-now-mp4s",
    question: "Why are some GIFs now MP4s?",
    answer: [
      "Those aren't GIFs anymore, those are MP4s. BDSMLR is serving MP4s for a lot of what previously was GIFs, and I have no idea why. BDSMLR's current site even handles this by making videos look like GIFs: it autoplays them and disables the video controls.",
      "A lot of the GIF links are broken, so the app falls back to the MP4s that are more reliable. Another issue is that the mime type is sometimes set to null even though the URL ends in .gif. Some GIFs are also massive, which might be why they switched to video. We always try to show a GIF when one is available rather than an MP4.",
    ],
  },
  {
    id: "why-are-some-posts-empty",
    question: "Why are some posts empty with no images and no text?",
    answer: [
      "That is also out of our control, and we cannot explain why it happens. Some posts just come back with no content at all.",
      "You can click the BDSMLR logo on the post to open it on BDSMLR, and you will see it does not work there either.",
    ],
  },
];

function scrollToHash() {
  const id = window.location.hash.slice(1);
  if (!id) return;
  const target = document.getElementById(id);
  if (target) target.scrollIntoView();
}

const proseLink =
  "font-medium text-primary underline-offset-4 hover:underline";

const sectionTitle = "text-base font-semibold text-card-foreground";

const prose = "flex flex-col gap-2.5 text-sm leading-relaxed text-muted-foreground";

export default function AboutPage() {
  onMount(() => {
    // The browser may miss the anchor when arriving from another route, so
    // apply it once the FAQ entries have rendered.
    scrollToHash();
  });

  return (
    <Page info="About" width="lg" class="max-w-3xl">
      <Title>About - bbdsmlr</Title>
      <PageHeader
        title="What our backend does"
        description="Better BDSMLR is an unofficial, open source front-end for BDSMLR. Your browser talks to this app, and this app talks to BDSMLR for you. That round trip is all the server really is."
      />

      <div
        class="mb-7 flex flex-wrap items-center gap-2.5"
        aria-label="How the app connects to BDSMLR"
      >
        <Badge
          variant="secondary"
          class="px-3.5 py-1.5 text-xs font-semibold"
        >
          Your browser
        </Badge>
        <span class="text-lg text-muted-foreground">→</span>
        <Badge
          variant="secondary"
          class="px-3.5 py-1.5 text-xs font-semibold"
        >
          This app's server
        </Badge>
        <span class="text-lg text-muted-foreground">→</span>
        <Badge
          variant="secondary"
          class="px-3.5 py-1.5 text-xs font-semibold"
        >
          BDSMLR
        </Badge>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <Card class="gap-3 p-5 sm:p-6">
          <h2 class={sectionTitle}>Why the server is needed</h2>
          <div class={prose}>
            <p>
              BDSMLR does not let other websites call its API directly, and the
              login cookie it gives you is tied to bdsmlr.com. So the server
              sits in the middle. It makes the request for you, carries your
              session back to BDSMLR, and hands you the result.
            </p>
            <p>
              It also handles the awkward parts behind the scenes: the separate
              sign-in for messages, the security token for sending them,
              publishing through BDSMLR's older composer, and RSS feeds for
              readers that cannot run this app. A few public lookups are cached
              briefly to make repeat visits feel faster.
            </p>
          </div>
        </Card>

        <Card class="gap-3 p-5 sm:p-6">
          <h2 class={sectionTitle}>What it does not do</h2>
          <div class={prose}>
            <p>
              It does not host anything. Posts, images, videos, blogs,
              messages, and your account all live on BDSMLR. This app only asks
              for them and shows them to you.
            </p>
            <p>
              It does not keep a database of your posts, likes, or messages,
              and it does not save your password. Your browser keeps your local
              settings and session cookies. The server passes your login to
              BDSMLR to start a session, then lets it go. And if BDSMLR hides,
              blocks, or deletes something, this app cannot get around that.
            </p>
          </div>
        </Card>
      </div>

      <Card id="open-source" class="mt-4 scroll-mt-20 gap-3 p-5 sm:p-6">
        <h2 class={sectionTitle}>Open source</h2>
        <div class={prose}>
          <p>
            You do not have to take any of that on faith. The whole app, the
            server included, is open source at{" "}
            <a
              class={proseLink}
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/Zastraeaxyz/bdsmlr
            </a>
            . You can read exactly what runs on the server, check what it logs,
            and run your own copy.
          </p>
          <p>
            Bug reports and feature requests belong in the repository's issue
            tracker, and pull requests are welcome. Problems with your account,
            missing posts, or anything that also fails on bdsmlr.com needs to
            go to BDSMLR instead, since this project cannot change what their
            API returns.
          </p>
        </div>
      </Card>

      <Card class="mt-4 gap-3 p-5 sm:p-6">
        <h2 class={sectionTitle}>Analytics</h2>
        <div class={prose}>
          <p>
            Better BDSMLR uses Umami, a cookieless analytics tool. It tells us
            which parts of the app get used, so we know where to spend time
            and what to fix.
          </p>
          <p>
            We record page views, approximate location such as country, and
            coarse actions. That includes likes and unlikes, reblogs and their
            mode, comments by length only, that a search happened, follows,
            sign-ins, sort and view changes, and similar feature use. Profile
            page views are recorded so we can see which profiles are popular.
            None of this is linked to your account.
          </p>
        </div>
        <Alert class="border-primary/35 bg-primary/10">
          <AlertDescription class="text-foreground">
            Analytics does not collect your account or blog identity, post
            content, comment text, messages, search terms, tag names, email
            addresses, or passwords. There is no session recording, no
            advertising pixel, no cross-site tracking, and we do not sell
            data.
          </AlertDescription>
        </Alert>
        <div class={prose}>
          <p>
            Umami does not use cookies. The tracker honors Do Not Track, so if
            your browser sends it, nothing is recorded. The goal is to
            understand the app, not the people using it.
          </p>
        </div>
      </Card>

      <Card class="mt-4 gap-3 p-5 sm:p-6">
        <h2 class={sectionTitle}>When something breaks</h2>
        <Alert class="border-primary/35 bg-primary/10">
          <AlertDescription class="text-foreground">
            BDSMLR sometimes changes its API, goes down, or returns messy
            data. When that happens, parts of this app can stumble even
            though the app itself is fine. The server cannot fix BDSMLR's
            data. It just passes it along.
          </AlertDescription>
        </Alert>
      </Card>

      <section id="faq" class="mt-8 scroll-mt-20">
        <h2 class="mb-3 text-lg font-bold tracking-tight">
          Frequently asked questions
        </h2>
        <div class="flex flex-col gap-3">
          <For each={faqs}>
            {(faq) => (
              <Card
                id={faq.id}
                class="gap-3 p-4 scroll-mt-20 target:border-primary/50 sm:p-5"
              >
                <h3 class="text-base font-semibold">
                  <a
                    href={`#${faq.id}`}
                    aria-label={`Link to "${faq.question}"`}
                    class="text-card-foreground underline-offset-4 hover:underline"
                    onClick={(event) => {
                      event.preventDefault();
                      window.history.pushState(null, "", `#${faq.id}`);
                      document.getElementById(faq.id)?.scrollIntoView();
                    }}
                  >
                    <span class="mr-2 font-normal text-muted-foreground">
                      #
                    </span>
                    {faq.question}
                  </a>
                </h3>
                <div class={prose}>
                  <For each={faq.answer}>
                    {(paragraph) => <p>{paragraph}</p>}
                  </For>
                </div>
              </Card>
            )}
          </For>
        </div>
      </section>
    </Page>
  );
}
