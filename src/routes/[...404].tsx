import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { REPO_URL } from "~/lib/links";

export default function NotFound() {
  return (
    <main class="notfound-page">
      <Title>Page Not Found - bbdsmlr</Title>
      <h1>Page Not Found</h1>
      <p>
        That page does not exist. Head back to the <A href="/">home page</A>, or
        read the <a href={REPO_URL} target="_blank" rel="noopener noreferrer">source code on GitHub</a>.
      </p>
    </main>
  );
}
