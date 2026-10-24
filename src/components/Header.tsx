import { createEffect, createSignal, For, Show, onCleanup, onMount } from 'solid-js'
import { useNavigate, A } from '@solidjs/router'
import { useAuth } from '../lib/useAuth'
import { useBlogAvatar } from '../lib/blogAvatar'
import { unreadCount, refreshMessageUnread } from '../lib/messageUnread'

interface HeaderProps {
  info?: string
  children?: any
}

export default function Header(props: HeaderProps) {
  const navigate = useNavigate()
  const { user, logout, blogs, activeBlogId, activeBlog, setActiveBlog } = useAuth()
  const [showDropdown, setShowDropdown] = createSignal(false)
  const avatarUrl = useBlogAvatar(() => activeBlogId())

  let containerRef: HTMLDivElement | undefined

  const handleSignOut = () => {
    setShowDropdown(false)
    logout()
    navigate('/login', { replace: true })
  }

  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      setShowDropdown(false)
    }
  }

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setShowDropdown(false)
  }

  onMount(() => {
    if (typeof document === 'undefined') return
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleKeydown)
  })

  onCleanup(() => {
    if (typeof document === 'undefined') return
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('keydown', handleKeydown)
  })

  createEffect(() => {
    if (typeof window === 'undefined') return
    if (!user()) return
    void refreshMessageUnread()
    const timer = setInterval(() => void refreshMessageUnread(), 60000)
    const handleFocus = () => void refreshMessageUnread()
    window.addEventListener('focus', handleFocus)
    onCleanup(() => {
      clearInterval(timer)
      window.removeEventListener('focus', handleFocus)
    })
  })

  return (
    <header style="view-transition-name: header">
      <h1><A href="/">BDSMLR</A></h1>
      {props.info && <span class="user-info">{props.info}</span>}
      {props.children}
      <A href="/" class="btn-ghost">Home</A>
      <A href="/search" class="btn-ghost">Search</A>
      {user() ? (
        <div class="user-dropdown" ref={containerRef}>
          <button
            type="button"
            class="btn-ghost user-dropdown-trigger"
            onClick={() => setShowDropdown(!showDropdown())}
            aria-haspopup="true"
            aria-expanded={showDropdown()}
          >
            <Show when={avatarUrl()}>
              <img class="user-dropdown-avatar" src={avatarUrl()!} alt="" />
            </Show>
            <span>{activeBlog()?.name ?? user()!.blog_name}</span>
            <Show when={unreadCount() > 0}>
              <span class="message-badge">{unreadCount()}</span>
            </Show>
          </button>
          <Show when={showDropdown()}>
            <div class="user-dropdown-menu">
              <A
                href={`/${activeBlog()?.name ?? user()!.blog_name}`}
                class="user-dropdown-item"
                onClick={() => setShowDropdown(false)}
              >
                My blog
              </A>
              <A
                href="/for-you"
                class="user-dropdown-item"
                onClick={() => setShowDropdown(false)}
              >
                For you
              </A>
              <A
                href="/following"
                class="user-dropdown-item"
                onClick={() => setShowDropdown(false)}
              >
                Following
              </A>
              <A
                href="/activity"
                class="user-dropdown-item"
                onClick={() => setShowDropdown(false)}
              >
                Activity
              </A>
              <A
                href="/search"
                class="user-dropdown-item"
                onClick={() => setShowDropdown(false)}
              >
                Search
              </A>
              <A
                href="/liked"
                class="user-dropdown-item"
                onClick={() => setShowDropdown(false)}
              >
                Liked
              </A>
              <A
                href="/messages"
                class="user-dropdown-item user-dropdown-messages"
                onClick={() => setShowDropdown(false)}
              >
                <span>Messages</span>
                <Show when={unreadCount() > 0}>
                  <span class="message-badge">{unreadCount()}</span>
                </Show>
              </A>
              <Show when={blogs().length > 1}>
                <div class="user-dropdown-section">Active blog</div>
                <For each={blogs()}>
                  {(blog) => (
                    <button
                      type="button"
                      class="user-dropdown-item user-dropdown-blog"
                      classList={{ active: blog.id === activeBlogId() }}
                      onClick={() => {
                        setActiveBlog(blog.id)
                        setShowDropdown(false)
                        window.location.reload()
                      }}
                    >
                      <span>{blog.name}</span>
                      <Show when={blog.id === activeBlogId()}>
                        <span class="user-dropdown-check">✓</span>
                      </Show>
                    </button>
                  )}
                </For>
              </Show>
              <button
                type="button"
                class="user-dropdown-item"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </div>
          </Show>
        </div>
      ) : (
        <A href="/login" class="btn-ghost">Sign in</A>
      )}
    </header>
  )
}
