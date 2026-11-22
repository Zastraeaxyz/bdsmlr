import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";
import { ChevronLeft, ChevronRight, X } from "lucide-solid";
import { getMediaType } from "../lib/sanitize";
import { surfaceForPath, trackEvent } from "../lib/analytics";
import { AutoLoopVideo } from "./AutoLoopVideo";
import type { GalleryItem, MediaGallery } from "../lib/mediaGallery";
import { Button } from "./ui/button";

interface LightBoxProps {
  /** Single-item mode, used by the composer preview. */
  url?: string | null;
  onClose?: () => void;
  /** Gallery mode, used by feeds. */
  gallery?: MediaGallery;
}

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tag = element.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    tag === "VIDEO" ||
    element.isContentEditable
  );
}

export function LightBox(props: LightBoxProps) {
  let closeButton: HTMLButtonElement | undefined;
  let wasOpen = false;
  let touchStartX = 0;

  const isOpen = () =>
    props.gallery ? props.gallery.isOpen() : props.url != null;

  const item = createMemo<GalleryItem | null>(() => {
    if (props.gallery) return props.gallery.item();
    if (!props.url) return null;
    return { url: props.url, type: getMediaType(props.url), fallbacks: [] };
  });

  const close = () => {
    if (props.gallery) props.gallery.close();
    else props.onClose?.();
  };

  const [candidateState, setCandidateState] = createSignal<{
    item: GalleryItem;
    index: number;
  } | null>(null);

  const candidateIndex = () => {
    const current = item();
    const state = candidateState();
    return state && current && state.item === current ? state.index : 0;
  };

  const candidates = () => {
    const current = item();
    return current ? [current, ...current.fallbacks] : [];
  };

  const candidate = () => {
    const list = candidates();
    return list[Math.min(candidateIndex(), list.length - 1)] ?? null;
  };

  const nextCandidate = () => {
    const current = item();
    if (!current) return;
    const list = [current, ...current.fallbacks];
    const index = Math.min(candidateIndex() + 1, list.length - 1);
    setCandidateState({ item: current, index });
  };

  const hasGallery = () => !!props.gallery && props.gallery.itemCount() > 1;

  createEffect(() => {
    const open = isOpen();
    if (open && !wasOpen) {
      const current = item();
      if (typeof window !== "undefined") {
        trackEvent("media-open", {
          surface: surfaceForPath(window.location.pathname),
          mediaType: current?.type ?? "image",
        });
      }
    }
    wasOpen = open;
  });

  createEffect(() => {
    if (!isOpen() || typeof document === "undefined") return;
    const previous = document.activeElement as HTMLElement | null;
    queueMicrotask(() => closeButton?.focus());
    onCleanup(() => previous?.focus?.());
  });

  createEffect(() => {
    if (!isOpen() || typeof window === "undefined") return;

    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;

      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (!props.gallery) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        props.gallery.prevItem();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        props.gallery.nextItem();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        props.gallery.prevGroup();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        props.gallery.nextGroup();
      }
    };

    window.addEventListener("keydown", handler);
    onCleanup(() => window.removeEventListener("keydown", handler));
  });

  const onTouchStart = (event: TouchEvent) => {
    touchStartX = event.touches[0]?.clientX ?? 0;
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (!props.gallery || !hasGallery()) return;
    const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX;
    if (Math.abs(delta) < 48) return;
    if (delta > 0) props.gallery.prevItem();
    else props.gallery.nextItem();
  };

  return (
    <Show when={isOpen()}>
      <div
        class="fixed inset-0 z-[60] flex flex-col bg-black/95"
        role="dialog"
        aria-modal="true"
        aria-label="Media viewer"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div class="safe-top flex items-center justify-between p-2">
          <Show when={hasGallery()}>
            <span class="px-3 text-sm text-white/80" aria-live="polite">
              {props.gallery!.itemIndex() + 1} / {props.gallery!.itemCount()}
            </span>
          </Show>
          <Button
            ref={closeButton}
            type="button"
            variant="secondary"
            size="icon"
            class="ml-auto size-11 rounded-full"
            onClick={close}
            aria-label="Close media viewer"
          >
            <X class="size-5" />
          </Button>
        </div>

        <div
          class="flex min-h-0 flex-1 items-center justify-center px-2 pb-4"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <Show when={hasGallery()}>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              class="absolute left-2 top-1/2 z-10 size-11 -translate-y-1/2 rounded-full opacity-90"
              aria-label="Previous media"
              onClick={() => props.gallery!.prevItem()}
            >
              <ChevronLeft class="size-5" />
            </Button>
          </Show>

          <Show when={candidate()} keyed>
            {(current) => (
              <Show
                when={current.type === "image"}
                fallback={
                  <div class="w-full [&_video]:mx-auto [&_video]:max-h-[80dvh] [&_video]:max-w-full">
                    <AutoLoopVideo
                      src={current.url}
                      onError={nextCandidate}
                      forceControls
                    />
                  </div>
                }
              >
                <img
                  src={current.url}
                  alt=""
                  class="max-h-[80dvh] max-w-full object-contain"
                  onError={nextCandidate}
                />
              </Show>
            )}
          </Show>

          <Show when={hasGallery()}>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              class="absolute right-2 top-1/2 z-10 size-11 -translate-y-1/2 rounded-full opacity-90"
              aria-label="Next media"
              onClick={() => props.gallery!.nextItem()}
            >
              <ChevronRight class="size-5" />
            </Button>
          </Show>
        </div>
      </div>
    </Show>
  );
}
