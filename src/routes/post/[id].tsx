import { useParams, useNavigate, A } from "@solidjs/router";
import { useAuth } from "~/lib/useAuth";
import Header from "~/components/Header";
import PostDetail from "~/components/PostDetail";

export default function PostPage() {
  const params = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleAuthorKnown = (blogName: string) => {
    const to = `/${blogName}/post/${params.id}`;
    if (typeof document !== "undefined" && document.startViewTransition) {
      document.startViewTransition(async () => {
        navigate(to, { replace: true });
        await new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        );
      });
    } else {
      navigate(to, { replace: true });
    }
  };

  return (
    <div class="home-page">
      <Header info={user()?.blog_name || user()?.username || undefined}>
        <A href="/home" class="btn-ghost">
          Home
        </A>
        {user() && (
          <A href={`/${user()!.blog_name}`} class="btn-ghost">
            My feed
          </A>
        )}
      </Header>
      <main>
        <PostDetail
          postId={Number(params.id)}
          checkBlogGone
          onAuthorKnown={handleAuthorKnown}
        />
      </main>
    </div>
  );
}
