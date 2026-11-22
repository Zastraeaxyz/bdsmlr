import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { confirmAge, hasConfirmedAge } from "~/lib/ageGate";
import { trackEvent } from "~/lib/analytics";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "./ui/dialog";

export function AgeGate() {
  const [visible, setVisible] = createSignal(false);
  let previousOverflow = "";
  let confirmButton: HTMLButtonElement | undefined;

  const unlockScroll = () => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = previousOverflow;
    }
  };

  onMount(() => {
    if (hasConfirmedAge()) return;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setVisible(true);
    queueMicrotask(() => confirmButton?.focus());
    onCleanup(unlockScroll);
  });

  const accept = () => {
    confirmAge();
    trackEvent("age-gate-accept");
    unlockScroll();
    setVisible(false);
  };

  const leave = () => {
    trackEvent("age-gate-leave");
  };

  return (
    <Show when={visible()}>
      <Dialog open modal>
        <DialogPortal>
          <DialogContent
            showCloseButton={false}
            class="max-w-md"
            onEscapeKeyDown={(event) => event.preventDefault()}
            onPointerDownOutside={(event) => event.preventDefault()}
          >
            <DialogHeader>
              <span class="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
                18+
              </span>
              <DialogTitle class="text-center text-xl">
                This site contains adult content
              </DialogTitle>
              <DialogDescription class="text-center">
                Better BDSMLR is a browser for BDSMLR, which hosts adult
                material. Confirm that you are at least 18 years old to
                continue.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter class="flex-col gap-2 sm:flex-col">
              <Button
                ref={confirmButton}
                type="button"
                class="h-11 w-full"
                onClick={accept}
              >
                I am 18 or older
              </Button>
              <Button
                as="a"
                href="https://www.google.com"
                variant="ghost"
                class="h-11 w-full"
                onClick={leave}
              >
                Leave
              </Button>
            </DialogFooter>
            <p class="text-center text-xs text-muted-foreground">
              Your answer is stored only in this browser.
            </p>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </Show>
  );
}
