import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import { useLocation } from "@solidjs/router";
import { ArrowUp } from "lucide-solid";
import { Button } from "./ui/button";

const SHOW_AFTER = 400;

export function ScrollToTop() {
  const location = useLocation();
  const [visible, setVisible] = createSignal(false);

  const update = () => {
    if (typeof window === "undefined") return;
    setVisible(window.scrollY > SHOW_AFTER);
  };

  onMount(() => {
    update();
    window.addEventListener("scroll", update, { passive: true });
    onCleanup(() => window.removeEventListener("scroll", update));
  });

  createEffect(() => {
    location.pathname;
    queueMicrotask(update);
  });

  return (
    <Show when={visible()}>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        class="fixed bottom-20 right-4 z-30 size-11 rounded-full shadow-lg md:bottom-6"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Scroll back to top"
        title="Back to top"
      >
        <ArrowUp class="size-5" />
      </Button>
    </Show>
  );
}
