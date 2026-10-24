import { Title } from "@solidjs/meta";
import Header from "~/components/Header";

export default function AboutPage() {
  return (
    <div class="home-page about-page">
      <Title>About the backend - bbdsmlr</Title>
      <Header info="About" />
      <main>
        <section class="about-hero">
          <h2>What our backend does</h2>
          <p class="about-lede">
            Better BDSMLR is a separate front-end for BDSMLR. Your browser talks
            to this app, and this app talks to BDSMLR for you. The backend is
            the part that makes those conversations possible.
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
          <div class="about-list">
            <div class="about-item">
              <strong>Browsers are not allowed to call BDSMLR directly</strong>
              <p>
                BDSMLR's API does not allow requests from another website. Our
                server makes the request for you, then sends the answer back to
                your browser. This is the most common reason a backend is used.
              </p>
            </div>
            <div class="about-item">
              <strong>It keeps you signed in</strong>
              <p>
                BDSMLR gives your browser a session cookie after login. Because
                that cookie belongs to bdsmlr.com, it cannot be used directly by
                this app. Our server receives the cookie and passes it back to
                BDSMLR on your behalf.
              </p>
            </div>
            <div class="about-item">
              <strong>It supports messages</strong>
              <p>
                BDSMLR messages use a different login system from the rest of
                the site. Our server completes that extra sign-in, keeps the
                message session active, and checks the security token needed
                when you send a message or image.
              </p>
            </div>
            <div class="about-item">
              <strong>It builds RSS feeds</strong>
              <p>
                RSS readers cannot run this app's JavaScript. Our server creates
                the RSS files itself so feed readers can follow a blog without
                opening the website.
              </p>
            </div>
            <div class="about-item">
              <strong>It speeds up repeat visits</strong>
              <p>
                Some public information, such as a blog name lookup or a blog's
                basic details, is kept briefly in memory. This reduces repeated
                requests to BDSMLR and makes pages load faster.
              </p>
            </div>
          </div>
        </section>

        <section class="about-section">
          <h3>What it does not do</h3>
          <div class="about-list">
            <div class="about-item">
              <strong>It does not host BDSMLR content</strong>
              <p>
                Posts, images, videos, blogs, and messages are stored by
                BDSMLR. This app only displays them.
              </p>
            </div>
            <div class="about-item">
              <strong>It does not keep a database of your activity</strong>
              <p>
                The app does not save your posts, likes, messages, or browsing
                history in a database. Your browser stores your local settings
                and session cookies.
              </p>
            </div>
            <div class="about-item">
              <strong>It does not store your password</strong>
              <p>
                Your login is passed through the server to BDSMLR so the session
                can be created. The server does not save your password after the
                request finishes.
              </p>
            </div>
            <div class="about-item">
              <strong>It does not bypass BDSMLR's rules</strong>
              <p>
                Private blogs, blocks, deletions, and account permissions still
                come from BDSMLR. If BDSMLR says no, this app says no.
              </p>
            </div>
          </div>
        </section>

        <section class="about-section">
          <h3>When something breaks</h3>
          <div class="about-callout">
            <p>
              BDSMLR sometimes changes its API, has outages, or returns
              inconsistent data. When that happens, parts of this app can fail
              or show unexpected results even though the app itself is working.
              The backend does not fix BDSMLR's data. It only passes it along.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
