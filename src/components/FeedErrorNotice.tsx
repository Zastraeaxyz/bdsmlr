import { Show } from "solid-js";
import { A } from "@solidjs/router";
import { AlertTriangle, Lock } from "lucide-solid";
import { isPrivateBlogError } from "~/lib/blogErrors";
import { isRateLimitMessage } from "~/lib/requestError";
import { useAuth } from "~/lib/useAuth";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";

export function FeedErrorNotice(props: {
  message: string;
  blogName?: string;
  onRetry?: () => void;
}) {
  const { user } = useAuth();

  return (
    <Show
      when={isRateLimitMessage(props.message)}
      fallback={
        <Show
          when={isPrivateBlogError(props.message)}
          fallback={
            <Alert variant="destructive">
              <AlertTitle>Could not load</AlertTitle>
              <AlertDescription>{props.message}</AlertDescription>
            </Alert>
          }
        >
          <Alert>
            <Lock class="size-4" />
            <AlertTitle>This blog is private.</AlertTitle>
            <AlertDescription class="flex flex-col items-start gap-3">
              <span>
                {user()
                  ? "You are signed in, but this blog still is not visible to you. You may need to follow it on BDSMLR first."
                  : `Sign in to your BDSMLR account to view${
                      props.blogName ? ` @${props.blogName}` : " this blog"
                    }.`}
              </span>
              <Show when={!user()}>
                <Button as={A} href="/login" size="sm">
                  Sign in
                </Button>
              </Show>
            </AlertDescription>
          </Alert>
        </Show>
      }
    >
      <Alert variant="warning" role="status">
        <AlertTriangle class="size-4" />
        <AlertTitle>BDSMLR is limiting requests.</AlertTitle>
        <AlertDescription class="flex flex-col items-start gap-3">
          <span>
            This is not a problem with this site or with this blog. BDSMLR is
            refusing new requests for a minute or two, then everything loads
            again.
          </span>
          <Show when={props.onRetry}>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => props.onRetry?.()}
            >
              Try again
            </Button>
          </Show>
        </AlertDescription>
      </Alert>
    </Show>
  );
}
