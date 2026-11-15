import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";
import { getMediaType } from "../lib/sanitize";
import { surfaceForPath, trackEvent } from "../lib/analytics";
import { AutoLoopVideo } from "./AutoLoopVideo";
import type { GalleryItem, MediaGallery } from "../lib/mediaGallery";

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

  return (
    <Show when={isOpen()}>
      <div
        class="lightbox-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Media viewer"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div class="lightbox-content">
          <button
            ref={closeButton}
            type="button"
            class="lightbox-close"
            onClick={close}
            aria-label="Close media viewer"
          >
            ✕
          </button>
          <Show when={candidate()} keyed>
            {(current) => (
              <Show
                when={current.type === "image"}
                fallback={
                  <AutoLoopVideo
                    src={current.url}
                    onError={nextCandidate}
                    forceControls
                  />
                }
              >
                <img src={current.url} alt="" onError={nextCandidate} />
              </Show>
            )}
          </Show>
          <Show when={props.gallery && props.gallery.itemCount() > 1}>
            <div class="lightbox-counter" aria-live="polite">
              {props.gallery!.itemIndex() + 1} / {props.gallery!.itemCount()}
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
}
