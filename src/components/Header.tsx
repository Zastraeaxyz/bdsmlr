import { createEffect, createSignal, For, Show, onCleanup, onMount } from 'solid-js'
import { useNavigate, A } from '@solidjs/router'
import { useAuth } from '../lib/useAuth'
import { useBlogAvatar } from '../lib/blogAvatar'
import { DiscordIcon, GitHubIcon } from './Icons'
import { DISCORD_URL, REPO_URL } from '../lib/links'
import { unreadCount, refreshMessageUnread } from '../lib/messageUnread'
import { activityUnreadCount, refreshActivityUnread } from '../lib/activityUnread'
import { features } from '../lib/features'
import { trackEvent } from '../lib/analytics'
import OutageBanner from './OutageBanner'

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
    trackEvent('login', { result: 'logout' })
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

  createEffect(() => {
    if (typeof window === 'undefined') return
    const blog = activeBlog()
    if (!user() || !blog) return
    void refreshActivityUnread(blog.id, blog.name)
    const timer = setInterval(
      () => void refreshActivityUnread(blog.id, blog.name),
      120000,
    )
    const handleFocus = () => void refreshActivityUnread(blog.id, blog.name)
    window.addEventListener('focus', handleFocus)
    onCleanup(() => {
      clearInterval(timer)
      window.removeEventListener('focus', handleFocus)
    })
  })

  const closeDropdown = () => setShowDropdown(false)

  return (
    <>
      <header style="view-transition-name: header">
      <h1><A href="/home">BDSMLR</A></h1>
      {props.info && <span class="user-info">{props.info}</span>}
      {props.children}
      <nav class="nav-desktop">
        <A href="/home" class="btn-ghost">Home</A>
        <A href="/compose" class="btn-ghost">Post</A>
        <Show when={!user()}>
          <A href="/about" class="btn-ghost">About</A>
        </Show>
        <Show when={!user()}>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            class="btn-ghost"
          >
            GitHub
          </a>
        </Show>
        <Show when={!user()}>
          <A href="/login" class="btn-ghost">Sign in</A>
        </Show>
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          class="btn-ghost"
        >
          Discord
        </a>
      </nav>
      <Show
        when={user()}
        fallback={
          <div class="user-dropdown nav-mobile-only" ref={containerRef}>
            <button
              type="button"
              class="btn-ghost user-dropdown-trigger"
              onClick={() => setShowDropdown(!showDropdown())}
              aria-haspopup="true"
              aria-expanded={showDropdown()}
            >
              <span>Menu</span>
            </button>
            <Show when={showDropdown()}>
              <div class="user-dropdown-menu">
                <A href="/home" class="user-dropdown-item" onClick={closeDropdown}>
                  Home
                </A>
                <A href="/compose" class="user-dropdown-item" onClick={closeDropdown}>
                  Post
                </A>
                <A href="/about" class="user-dropdown-item" onClick={closeDropdown}>
                  About
                </A>
                <A href="/changelog" class="user-dropdown-item" onClick={closeDropdown}>
                  Changelog
                </A>
                <A href="/login" class="user-dropdown-item" onClick={closeDropdown}>
                  Sign in
                </A>
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="user-dropdown-item user-dropdown-discord"
                  onClick={closeDropdown}
                >
                  <GitHubIcon class="icon" />
                  GitHub
                </a>
                <a
                  href={DISCORD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="user-dropdown-item user-dropdown-discord"
                  onClick={closeDropdown}
                >
                  <DiscordIcon class="icon" />
                  <span>Discord</span>
                </a>
              </div>
            </Show>
          </div>
        }
      >
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
            <span class="user-dropdown-name">{activeBlog()?.name ?? user()!.blog_name}</span>
            <Show when={unreadCount() > 0}>
              <span class="message-badge">{unreadCount()}</span>
            </Show>
          </button>
          <Show when={showDropdown()}>
            <div class="user-dropdown-menu">
              <div class="nav-mobile-only user-dropdown-mobile-nav">
                <A href="/home" class="user-dropdown-item" onClick={closeDropdown}>
                  Home
                </A>
                <A href="/compose" class="user-dropdown-item" onClick={closeDropdown}>
                  Post
                </A>
                <a
                  href={DISCORD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="user-dropdown-item user-dropdown-discord"
                  onClick={closeDropdown}
                >
                  <DiscordIcon class="icon" />
                  <span>Discord</span>
                </a>
              </div>
              <A
                href={`/${activeBlog()?.name ?? user()!.blog_name}`}
                class="user-dropdown-item"
                onClick={closeDropdown}
              >
                My blog
              </A>
              <Show when={features.forYou}>
                <A href="/for-you" class="user-dropdown-item" onClick={closeDropdown}>
                  For you
                </A>
              </Show>
              <A href="/following" class="user-dropdown-item" onClick={closeDropdown}>
                Following
              </A>
              <A
                href="/activity"
                class="user-dropdown-item user-dropdown-activity"
                onClick={closeDropdown}
              >
                <span>Activity</span>
                <Show when={activityUnreadCount() > 0}>
                  <span class="message-badge">{activityUnreadCount()}</span>
                </Show>
              </A>
              <A href="/compose" class="user-dropdown-item" onClick={closeDropdown}>
                Compose post
              </A>
              <A href="/blog-search" class="user-dropdown-item" onClick={closeDropdown}>
                Blog search
              </A>
              <A href="/liked" class="user-dropdown-item" onClick={closeDropdown}>
                Liked
              </A>
              <Show when={features.legacyBlogCustomization}>
                <A href="/customize" class="user-dropdown-item" onClick={closeDropdown}>
                  Customize blog
                </A>
              </Show>
              <A href="/drafts" class="user-dropdown-item" onClick={closeDropdown}>
                Drafts
              </A>
              <A href="/queue" class="user-dropdown-item" onClick={closeDropdown}>
                Queue
              </A>
              <A href="/settings" class="user-dropdown-item" onClick={closeDropdown}>
                Settings
              </A>
              <A href="/blocked" class="user-dropdown-item" onClick={closeDropdown}>
                Blocked blogs
              </A>
              <A href="/changelog" class="user-dropdown-item" onClick={closeDropdown}>
                Changelog
              </A>
              <A
                href="/messages"
                class="user-dropdown-item user-dropdown-messages"
                onClick={closeDropdown}
              >
                <span>Messages</span>
                <Show when={unreadCount() > 0}>
                  <span class="message-badge">{unreadCount()}</span>
                </Show>
              </A>
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                class="user-dropdown-item user-dropdown-discord mobile-hide"
                onClick={closeDropdown}
              >
                <DiscordIcon class="icon" />
                <span>Discord community</span>
              </a>
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
                        closeDropdown()
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
      </Show>
      </header>
      <OutageBanner />
    </>
  )
}
