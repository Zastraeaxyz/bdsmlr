import { createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js'
import { cx } from '~/lib/cva'
import { Play } from 'lucide-solid'

interface AutoLoopVideoProps {
  src: string
  onError?: (event: Event) => void
  /** Always show the native player controls, even for short clips. */
  forceControls?: boolean
  class?: string
}

const SHORT_VIDEO_THRESHOLD_SECONDS = 20

type VideoLength = 'unknown' | 'short' | 'long'

/** How much of the video must be visible before it starts playing. */
const MIN_VISIBLE_RATIO = 0.5

function isMostlyVisible(entry: IntersectionObserverEntry) {
  if (!entry.isIntersecting) return false
  const height = entry.boundingClientRect.height
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight
  // A video taller than the viewport can never reach the default ratio, so
  // lower the bar to "fills the visible area" for those.
  if (!height || !viewportHeight) return true
  return entry.intersectionRatio >= Math.min(MIN_VISIBLE_RATIO, viewportHeight / height)
}

export function AutoLoopVideo(props: AutoLoopVideoProps) {
  const [length, setLength] = createSignal<VideoLength>('unknown')
  const [playing, setPlaying] = createSignal(false)
  let video: HTMLVideoElement | undefined
  let userInteracted = false

  const isShort = () => length() === 'short'
  const showControls = () => props.forceControls === true || length() === 'long'

  // The GIF fallback swaps the source on the same element, so start over.
  createEffect(() => {
    void props.src
    userInteracted = false
    setLength('unknown')
  })

  onMount(() => {
    if (!video) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const element = video
    const observer = new IntersectionObserver(
      (entries) => {
        if (userInteracted) return
        for (const entry of entries) {
          if (isMostlyVisible(entry)) {
            if (element.paused) void element.play().catch(() => {})
          } else if (!element.paused) {
            element.pause()
          }
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    observer.observe(element)
    onCleanup(() => observer.disconnect())
  })

  // Only the native player controls can be operated directly, so only stop
  // managing playback when the video actually has controls to press.
  const rememberInteraction = () => {
    if (!showControls()) return
    userInteracted = true
  }

  const start = () => {
    userInteracted = true
    void video?.play().catch(() => {})
  }

  return (
    <div class={cx("relative w-full", props.class)}>
      <video
        ref={video}
        src={props.src}
        muted
        playsinline
        controls={showControls()}
        preload="metadata"
        loop={isShort()}
        class="w-full"
        onError={props.onError}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onClick={rememberInteraction}
        onKeyDown={rememberInteraction}
        onLoadedMetadata={(e) => {
          const element = e.currentTarget as HTMLVideoElement
          const duration = element.duration
          setLength(
            Number.isFinite(duration) && duration < SHORT_VIDEO_THRESHOLD_SECONDS
              ? 'short'
              : 'long',
          )
        }}
      />
      <Show when={!playing()}>
        <button
          type="button"
          class="absolute inset-0 flex items-center justify-center bg-black/20 text-white transition-colors hover:bg-black/30"
          onClick={start}
          aria-label="Play video"
        >
          <span class="flex size-14 items-center justify-center rounded-full bg-black/60 backdrop-blur">
            <Play class="size-6 translate-x-0.5" fill="currentColor" />
          </span>
        </button>
      </Show>
    </div>
  )
}
