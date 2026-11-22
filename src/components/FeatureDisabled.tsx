import Header from "~/components/Header";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";

export function FeatureDisabled(props: { title: string }) {
  return (
    <div class="flex min-h-dvh flex-col">
      <Header info={props.title} />
      <main class="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>{props.title} is disabled</CardTitle>
            <CardDescription>
              This feature is waiting until its BDSMLR backend behavior has been
              verified.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    </div>
  );
}
