import { useParams, A } from "@solidjs/router";
import { useAuth } from "~/lib/useAuth";
import Header from "~/components/Header";
import PostDetail from "~/components/PostDetail";

export default function PostPage() {
  const params = useParams();
  const { user } = useAuth();

  return (
    <div class="home-page">
      <Header info={user()?.blog_name || user()?.username || undefined}>
        <A href="/" class="btn-ghost">
          Home
        </A>
        {user() && (
          <A href={`/${user()!.blog_name}`} class="btn-ghost">
            My feed
          </A>
        )}
      </Header>
      <main>
        <PostDetail postId={Number(params.id)} />
      </main>
    </div>
  );
}
