import { Show } from 'solid-js'
import { A } from '@solidjs/router'
import { useBlogAvatar } from '~/lib/blogAvatar'

interface BlogAvatarProps {
  blogId?: number | null
  blogName?: string | null
  size?: number
}

export function BlogAvatar(props: BlogAvatarProps) {
  const avatar = useBlogAvatar(() => props.blogId ?? null)
  const size = () => props.size ?? 28
  const letter = () => ((props.blogName || '?')[0] || '?').toUpperCase()

  const content = () => (
    <Show
      when={avatar()}
      fallback={
        <span
          class="blog-avatar-placeholder"
          style={{
            width: `${size()}px`,
            height: `${size()}px`,
            'font-size': `${Math.round(size() * 0.42)}px`,
          }}
        >
          {letter()}
        </span>
      }
    >
      <img
        class="blog-avatar-img"
        src={avatar()!}
        alt=""
        style={{ width: `${size()}px`, height: `${size()}px` }}
      />
    </Show>
  )

  return (
    <Show when={props.blogName} fallback={<span class="blog-avatar-link">{content()}</span>}>
      <A href={`/${props.blogName}`} class="blog-avatar-link">
        {content()}
      </A>
    </Show>
  )
}
