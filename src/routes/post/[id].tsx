import { useParams, useNavigate, A } from "@solidjs/router";
import { Show } from "solid-js";
import { useAuth } from "~/lib/useAuth";
import PostDetail from "~/components/PostDetail";
import { Page } from "~/components/Page";
import { Button } from "~/components/ui/button";

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
    <Page
      padded={false}
      actions={
        <>
          <Button
            as={A}
            href="/home"
            variant="ghost"
            size="sm"
            class="hidden h-9 sm:inline-flex"
          >
            Home
          </Button>
          <Show when={user()}>
            <Button
              as={A}
              href={`/${user()!.blog_name}`}
              variant="ghost"
              size="sm"
              class="hidden h-9 sm:inline-flex"
            >
              My feed
            </Button>
          </Show>
        </>
      }
    >
      <PostDetail
        postId={Number(params.id)}
        checkBlogGone
        onAuthorKnown={handleAuthorKnown}
      />
    </Page>
  );
}
