import { createSignal, createEffect, Show } from "solid-js";
import { A, useNavigate, useSearchParams } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { useAuth } from "~/lib/useAuth";
import { trackEvent } from "~/lib/analytics";
import { DiscordInvite } from "~/components/DiscordInvite";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Checkbox,
  CheckboxControl,
  CheckboxLabel,
} from "~/components/ui/checkbox";
import {
  TextField,
  TextFieldInput,
  TextFieldLabel,
} from "~/components/ui/text-field";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, login: authLogin } = useAuth();

  /** Where to go after signing in, so gated deep links survive the detour. */
  const nextPath = () => {
    const value = searchParams.next;
    const raw = Array.isArray(value) ? value[0] : value;
    if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
    return raw;
  };

  const destination = (blogName?: string | null) =>
    nextPath() ?? (blogName ? `/${blogName}` : "/home");

  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [acknowledged, setAcknowledged] = createSignal(false);

  createEffect(() => {
    if (user() && !authLoading()) {
      navigate(destination(user()!.blog_name), { replace: true });
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const u = await authLogin(email(), password());
      trackEvent("login", { result: "success" });
      navigate(destination(u.blog_name), { replace: true });
    } catch (err: unknown) {
      trackEvent("login", { result: "failure" });
      setError((err as Error)?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Title>Sign in — bbdsmlr</Title>
      <div class="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-8 sm:py-12">
        <Card class="w-full max-w-md gap-5 px-5 py-6 sm:px-8">
          <CardHeader class="gap-1.5 px-0 text-center">
            <CardTitle>
              <h1 class="text-2xl font-bold tracking-tight">Better BDSMLR</h1>
            </CardTitle>
            <CardDescription class="text-sm">
              Sign in to your bdsmlr.com account
            </CardDescription>
          </CardHeader>

          <CardContent class="px-0">
            <form class="flex flex-col gap-4" onSubmit={handleSubmit}>
              <Show when={error()}>
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{error()}</AlertDescription>
                </Alert>
              </Show>

              <TextField value={email()} onChange={setEmail}>
                <TextFieldLabel>Email or username</TextFieldLabel>
                <TextFieldInput
                  id="login"
                  name="login"
                  type="text"
                  autocomplete="off"
                  placeholder="Email or username"
                  required
                  class="h-11 text-base"
                />
              </TextField>

              <TextField value={password()} onChange={setPassword}>
                <TextFieldLabel>Password</TextFieldLabel>
                <TextFieldInput
                  id="password"
                  name="password"
                  type="password"
                  autocomplete="off"
                  placeholder="Password"
                  required
                  class="h-11 text-base"
                />
              </TextField>

              <Checkbox
                class="flex items-start gap-2.5"
                checked={acknowledged()}
                onChange={setAcknowledged}
              >
                <CheckboxControl class="mt-0.5" />
                <CheckboxLabel class="items-start text-xs font-normal leading-relaxed text-muted-foreground">
                  By logging in here you acknowledge that the developers of this
                  app own no content that is shown in this app, and that you are
                  of legal age to view adult content in your jurisdiction.
                </CheckboxLabel>
              </Checkbox>

              <Button
                type="submit"
                size="lg"
                class="h-11 w-full text-base"
                disabled={submitting() || !acknowledged() || authLoading()}
              >
                {submitting() ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>

          <Alert class="border-destructive/30 bg-destructive/5">
            <AlertDescription>
              <h2 class="mb-2 text-sm font-semibold text-foreground">
                Disclaimer
              </h2>
              <div class="flex flex-col gap-2.5">
                <p>
                  This app is an alternative front-end to the{" "}
                  <a
                    class="font-medium text-primary underline-offset-4 hover:underline"
                    href="http://bdsmlr.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    BDSMLR
                  </a>{" "}
                  Public API. All content displayed is not hosted by the
                  developers of this front-end. Content is copyright of the
                  original source (BDSMLR) and is user-provided, hosted on the
                  API website, not on this site.
                </p>
                <p>
                  This service may display user-generated adult content. By
                  using this app, you acknowledge that you are of legal age to
                  view such material in your jurisdiction, that the developers
                  assume no liability for user-submitted content, and that you
                  must comply with{" "}
                  <a
                    class="font-medium text-primary underline-offset-4 hover:underline"
                    href="http://bdsmlr.com/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    BDSMLR's Terms of Service
                  </a>
                  .
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <DiscordInvite location="login" />

          <A
            href="/about"
            class="text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            About this app and its backend
          </A>
        </Card>
      </div>
    </>
  );
}
