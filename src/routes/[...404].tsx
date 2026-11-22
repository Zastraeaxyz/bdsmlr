import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { REPO_URL } from "~/lib/links";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

export default function NotFound() {
  return (
    <main class="flex flex-1 items-center justify-center px-4 py-16">
      <Title>Page Not Found - bbdsmlr</Title>
      <Card class="w-full max-w-md items-center gap-3 px-6 py-10 text-center">
        <span class="text-5xl font-extrabold tracking-tight text-muted-foreground/60">
          404
        </span>
        <h1 class="text-2xl font-bold tracking-tight">Page Not Found</h1>
        <p class="text-sm leading-relaxed text-muted-foreground">
          That page does not exist. Head back to the{" "}
          <A
            class="font-medium text-primary underline-offset-4 hover:underline"
            href="/"
          >
            home page
          </A>
          , or read the{" "}
          <a
            class="font-medium text-primary underline-offset-4 hover:underline"
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            source code on GitHub
          </a>
          .
        </p>
        <Button as={A} href="/" class="mt-2 h-11 w-full">
          Go to the home page
        </Button>
      </Card>
    </main>
  );
}
