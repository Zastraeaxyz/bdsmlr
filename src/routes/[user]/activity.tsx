import { useParams } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { ActivityFeed } from "~/components/ActivityFeed";
import { PageHeader } from "~/components/Page";

export default function ActivityPage() {
  const params = useParams();
  const name = () => params.user ?? "";
  return (
    <>
      <Title>{name()} activity - bbdsmlr</Title>
      <main class="mx-auto flex w-full max-w-2xl flex-1 flex-col px-3 py-4 sm:px-4">
        <PageHeader title="Activity" />
        <ActivityFeed blogName={name()} />
      </main>
    </>
  );
}
