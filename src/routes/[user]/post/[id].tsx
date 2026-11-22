import { useParams } from "@solidjs/router";
import PostDetail from "~/components/PostDetail";

export default function UserPostPage() {
  const params = useParams();

  return (
    <main class="flex w-full flex-1 flex-col">
      <PostDetail
        postId={Number(params.id)}
        checkBlogGone
        backHref={`/${params.user}`}
        backLabel={`Back to @${params.user}`}
      />
    </main>
  );
}
