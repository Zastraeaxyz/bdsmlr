import { useParams } from "@solidjs/router";
import PostDetail from "~/components/PostDetail";

export default function UserPostPage() {
  const params = useParams();

  return (
    <main>
      <PostDetail
        postId={Number(params.id)}
        checkBlogGone
        backHref={`/${params.user}`}
        backLabel={`Back to @${params.user}`}
      />
    </main>
  );
}
