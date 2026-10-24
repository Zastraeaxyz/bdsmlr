import { createSignal } from 'solid-js'

interface AutoLoopVideoProps {
  src: string
  onError?: (event: Event) => void
}

const SHORT_VIDEO_THRESHOLD_SECONDS = 20

export function AutoLoopVideo(props: AutoLoopVideoProps) {
  const [isShort, setIsShort] = createSignal(false)

  return (
    <video
      src={props.src}
      muted
      controls
      preload="metadata"
      loop={isShort()}
      onError={props.onError}
      onLoadedMetadata={(e) => {
        const video = e.currentTarget as HTMLVideoElement
        if (Number.isFinite(video.duration) && video.duration < SHORT_VIDEO_THRESHOLD_SECONDS) {
          setIsShort(true)
        }
      }}
    />
  )
}
