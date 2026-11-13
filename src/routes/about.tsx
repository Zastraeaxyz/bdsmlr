import { Title } from "@solidjs/meta";
import { For, onMount } from "solid-js";
import Header from "~/components/Header";

interface FaqEntry {
  /** Stable anchor used for direct links to this question. */
  id: string;
  question: string;
  answer: string[];
}

const faqs: FaqEntry[] = [
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

export default function AboutPage() {
  onMount(() => {
    // The browser may miss the anchor when arriving from another route, so
    // apply it once the FAQ entries have rendered.
    scrollToHash();
  });

  return (
    <div class="home-page about-page">
      <Title>About - bbdsmlr</Title>
      <Header info="About" />
      <main>
        <section class="about-hero">
          <h2>What our backend does</h2>
          <p class="about-lede">
            Better BDSMLR is a separate front-end for BDSMLR. Your browser talks
            to this app, and this app talks to BDSMLR for you. That round trip
            is all the server really is.
          </p>
          <div class="about-flow" aria-label="How the app connects to BDSMLR">
            <div class="about-flow-step">Your browser</div>
            <span class="about-flow-arrow">→</span>
            <div class="about-flow-step">This app's server</div>
            <span class="about-flow-arrow">→</span>
            <div class="about-flow-step">BDSMLR</div>
          </div>
        </section>

        <section class="about-section">
          <h3>Why the server is needed</h3>
          <div class="about-copy">
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
        </section>

        <section class="about-section">
          <h3>What it does not do</h3>
          <div class="about-copy">
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
        </section>

        <section class="about-section">
          <h3>Analytics</h3>
          <div class="about-copy">
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
          <div class="about-callout">
            <p>
              Analytics does not collect your account or blog identity, post
              content, comment text, messages, search terms, tag names, email
              addresses, or passwords. There is no session recording, no
              advertising pixel, no cross-site tracking, and we do not sell
              data.
            </p>
          </div>
          <div class="about-copy">
            <p>
              Umami does not use cookies. The tracker honors Do Not Track, so if
              your browser sends it, nothing is recorded. The goal is to
              understand the app, not the people using it.
            </p>
          </div>
        </section>

        <section class="about-section">
          <h3>When something breaks</h3>
          <div class="about-callout">
            <p>
              BDSMLR sometimes changes its API, goes down, or returns messy
              data. When that happens, parts of this app can stumble even
              though the app itself is fine. The server cannot fix BDSMLR's
              data. It just passes it along.
            </p>
          </div>
        </section>

        <section class="about-section" id="faq">
          <h3>Frequently asked questions</h3>
          <div class="about-faq-list">
            <For each={faqs}>
              {(faq) => (
                <article class="about-faq" id={faq.id}>
                  <h4 class="about-faq-question">
                    <a
                      href={`#${faq.id}`}
                      aria-label={`Link to "${faq.question}"`}
                      onClick={(event) => {
                        event.preventDefault();
                        window.history.pushState(null, "", `#${faq.id}`);
                        document.getElementById(faq.id)?.scrollIntoView();
                      }}
                    >
                      {faq.question}
                    </a>
                  </h4>
                  <div class="about-copy">
                    <For each={faq.answer}>
                      {(paragraph) => <p>{paragraph}</p>}
                    </For>
                  </div>
                </article>
              )}
            </For>
          </div>
        </section>
      </main>
    </div>
  );
}
