import { createEffect, lazy, Show } from "solid-js";
import { isServer } from "solid-js/web";
import { useLocation, useNavigate } from "@solidjs/router";
import { useAuth } from "~/lib/useAuth";
import { serverRenderedAuthed } from "~/lib/initialAuth";
import LandingPage from "~/components/LandingPage";

const HomeFeed = lazy(() => import("~/components/HomeFeed"));

export const route = {
  path: ["/", "/home"],
};

export default function HomeRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const initialAuthed = serverRenderedAuthed();

  const showLanding = () => {
    if (location.pathname !== "/") return false;
    if (!isServer && !authLoading()) return !user();
    return !initialAuthed;
  };

  createEffect(() => {
    if (isServer) return;
    if (!user() || location.pathname !== "/") return;
    navigate(`/home${location.search}${location.hash}`, {
      replace: true,
      scroll: false,
    });
  });

  return (
    <Show when={!showLanding()} fallback={<LandingPage />}>
      <HomeFeed />
    </Show>
  );
}
