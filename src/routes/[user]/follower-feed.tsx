import { useParams } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { FollowerFeed } from "~/components/FollowerFeed";
import { PageHeader } from "~/components/Page";

export default function FollowerFeedPage() {
  const params = useParams();
  const name = () => params.user ?? "";
  return (
    <>
      <Title>{name()} follower feed - bbdsmlr</Title>
      <main class="mx-auto flex w-full max-w-2xl flex-1 flex-col px-3 py-4 sm:px-4">
        <PageHeader title="Followers' feed" />
        <FollowerFeed blogName={name()} />
      </main>
    </>
  );
}
