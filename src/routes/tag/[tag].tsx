import { useParams } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import Header from "~/components/Header";
import { PostSearchResults } from "~/components/PostSearchResults";

export default function TagPage() {
  const params = useParams();
  const tag = () => params.tag ?? "";
  const query = () =>
    `tag:${tag().includes(" ") ? `"${tag()}"` : tag()}`;

  return (
    <div class="home-page">
      <Title>#{tag()} - bbdsmlr</Title>
      <Header info={`#${tag()}`} />
      <main>
        <h2 class="section-title">Posts tagged #{tag()}</h2>
        <PostSearchResults query={query()} />
      </main>
    </div>
  );
}
