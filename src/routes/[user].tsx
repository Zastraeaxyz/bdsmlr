import {
  createEffect,
  createSignal,
  on,
  onCleanup,
  onMount,
  Show,
  type ParentProps,
} from 'solid-js'
import { useParams, useLocation, A } from '@solidjs/router'
import { Title } from '@solidjs/meta'
import {
  resolveIdentifier,
  getBlog,
  getBlogFollowState,
  getBlocked,
  followBlog,
  unfollowBlog,
  blockBlog,
  unblockBlog,
  reportBlog,
  type Blog,
} from '~/lib/api'
import Header from '~/components/Header'
import { BdsmlrIcon, RssIcon, WarningIcon } from '~/components/Icons'
import { BlogDescription } from '~/components/BlogDescription'
import { AppErrorBoundary } from '~/components/AppErrorBoundary'
import { FeedSettingsProvider } from '~/lib/feedSettings'
import { useAuth } from '~/lib/useAuth'
import { serverRenderedAuthed } from '~/lib/initialAuth'
import { LoginGateModal } from '~/components/LoginGateModal'
import {
  addCachedFollowingId,
  removeCachedFollowingId,
} from '~/lib/following'
import { trackEvent } from '~/lib/analytics'

const DEFAULT_FAVICON = '/favicon.ico'

function setFavicon(href: string) {
  if (typeof document === 'undefined') return
  let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  if (link.getAttribute('href') !== href) link.setAttribute('href', href)
}

export default function UserLayout(props: ParentProps) {
  const params = useParams()
  const slug = () => params.user
  const location = useLocation()
  const { user, activeBlogId, loading: authLoading } = useAuth()

  // The server told us whether the request carried a session; the client then
  // refines that once the stored user is loaded. Until then, trust the server
  // so signed-in visitors do not see the gate flash on first paint.
  const initialAuthed = serverRenderedAuthed()
  const signedIn = () => {
    if (user()) return true
    if (!authLoading()) return false
    return initialAuthed
  }
  // Shared post links stay readable without an account, even when the author
  // is known and the URL moved under the profile.
  const isPostView = () =>
    /^\/[^/]+\/post(\/|$)/.test(location.pathname)

  const [blog, setBlog] = createSignal<Blog | null>(null)
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal('')
  const [hideReblogs, setHideReblogs] = createSignal(false)
  const [hideRepeatingImages, setHideRepeatingImages] = createSignal(false)
  const [privateBlog, setPrivateBlog] = createSignal(false)
  const [v2session, setV2session] = createSignal<string | null>(null)
  const [followed, setFollowed] = createSignal(false)
  const [followBusy, setFollowBusy] = createSignal(false)
  const [followersCount, setFollowersCount] = createSignal<number | null>(null)
  const [blocked, setBlocked] = createSignal(false)
  const [blockBusy, setBlockBusy] = createSignal(false)
  const [showActions, setShowActions] = createSignal(false)
  const [showReport, setShowReport] = createSignal(false)
  const [reportReason, setReportReason] = createSignal('')
  const [reportBusy, setReportBusy] = createSignal(false)
  const [reportDone, setReportDone] = createSignal(false)
  const [actionError, setActionError] = createSignal('')
  let actionsRef: HTMLDivElement | undefined

  const isOwnBlog = () => {
    const current = blog()
    const u = user()
    if (!current || !u) return false
    const target = Number(current.id)
    return (
      (u.blogs ?? []).some((entry) => entry.id === target) ||
      u.blog_id === target
    )
  }

  const canAct = () => !!activeBlogId() && !!blog() && !isOwnBlog()

  const handleClickOutside = (e: MouseEvent) => {
    if (actionsRef && !actionsRef.contains(e.target as Node)) {
      setShowActions(false)
    }
  }

  onMount(() => {
    if (typeof document === 'undefined') return
    document.addEventListener('click', handleClickOutside)
  })

  onCleanup(() => {
    if (typeof document === 'undefined') return
    document.removeEventListener('click', handleClickOutside)
  })

  createEffect(() => {
    const name = slug()
    if (!name) return
    setLoading(true)
    setError('')
    setBlog(null)
    setFollowersCount(null)
    resolveIdentifier(name).then((resolved) => {
      if (!resolved.blogId) {
        setError(resolved.error || 'User not found')
        setLoading(false)
        return
      }
      getBlog(resolved.blogId).then((res) => {
        setBlog(res.blog ?? null)
        const rawCount = res.blog?.followersCount
        const count = rawCount != null ? Number(rawCount) : null
        setFollowersCount(count != null && Number.isFinite(count) ? count : null)
        setLoading(false)
      })
    })
  })

  createEffect(() => {
    const avatar = blog()?.avatarUrl
    if (typeof document === 'undefined') return
    setFavicon(avatar || DEFAULT_FAVICON)
    onCleanup(() => setFavicon(DEFAULT_FAVICON))
  })

  createEffect(
    on(
      () => slug(),
      (name) => {
        if (!name) return
        setPrivateBlog(false)
        setV2session(null)
        setActionError('')
        setShowActions(false)
        setShowReport(false)
        setReportDone(false)
        setReportReason('')
        setFollowed(false)
        setBlocked(false)
        if (!signedIn() || !activeBlogId()) return
        fetch(`/api/rss-session-info?user=${encodeURIComponent(name)}`, {
          credentials: 'include',
        })
          .then((r) => r.json().catch(() => null))
          .then((data) => {
            if (!data) return
            setPrivateBlog(!!data.private)
            setV2session(data.v2session || null)
          })
          .catch(() => {})
      },
    ),
  )

  createEffect(() => {
    const current = blog()
    const actor = activeBlogId()
    const u = user()
    if (!current || !actor || !u || isOwnBlog()) {
      setFollowed(false)
      setBlocked(false)
      return
    }
    const target = Number(current.id)
    let cancelled = false
    getBlogFollowState(actor, target)
      .then((res) => {
        if (!cancelled) setFollowed(!!(res.isFollowed ?? res.is_followed))
      })
      .catch(() => {
        if (!cancelled) setFollowed(false)
      })
    getBlocked(u.user_id)
      .then((res) => {
        if (cancelled) return
        const ids = res.blocked_blog_ids ?? res.blockedBlogIds ?? []
        setBlocked(ids.map(Number).includes(target))
      })
      .catch(() => {
        if (!cancelled) setBlocked(false)
      })
    return () => {
      cancelled = true
    }
  })

  const toggleFollow = async () => {
    const current = blog()
    const actor = activeBlogId()
    if (!current || !actor || followBusy()) return
    const target = Number(current.id)
    const next = !followed()
    setFollowBusy(true)
    setActionError('')
    try {
      const res = next
        ? await followBlog(actor, target)
        : await unfollowBlog(actor, target)
      if (res.ok === false || res.error) {
        throw new Error(res.error?.message || 'Could not update follow')
      }
      setFollowed(next)
      setFollowersCount((count) => Math.max(0, (count ?? 0) + (next ? 1 : -1)))
      trackEvent('follow', { action: next ? 'follow' : 'unfollow' })
      if (next) addCachedFollowingId(target, actor)
      else removeCachedFollowingId(target, actor)
    } catch (err: unknown) {
      setActionError((err as Error)?.message || 'Could not update follow')
    } finally {
      setFollowBusy(false)
    }
  }

  const toggleBlock = async () => {
    const current = blog()
    const actor = activeBlogId()
    if (!current || !actor || blockBusy()) return
    const target = Number(current.id)
    const next = !blocked()
    if (
      !window.confirm(
        next
          ? `Block @${current.name} and the owner's other blogs?`
          : `Unblock @${current.name}?`,
      )
    )
      return
    setBlockBusy(true)
    setActionError('')
    try {
      const res = next
        ? await blockBlog(actor, target)
        : await unblockBlog(actor, target)
      if (res.ok === false || res.error) {
        throw new Error(res.error?.message || 'Could not update block')
      }
      setBlocked(next)
      trackEvent('block', { action: next ? 'block' : 'unblock' })
      if (next) {
        setFollowed(false)
        removeCachedFollowingId(target, actor)
      }
      setShowActions(false)
    } catch (err: unknown) {
      setActionError((err as Error)?.message || 'Could not update block')
    } finally {
      setBlockBusy(false)
    }
  }

  const submitReport = async (e: Event) => {
    e.preventDefault()
    const current = blog()
    const actor = activeBlogId()
    const reason = reportReason().trim()
    if (!current || !actor || !reason || reportBusy()) return
    setReportBusy(true)
    setActionError('')
    try {
      const res = await reportBlog(actor, Number(current.id), reason)
      if (res.ok === false || res.error) {
        throw new Error(res.error?.message || 'Could not submit report')
      }
      setReportDone(true)
      trackEvent('report', { target: 'blog' })
      setShowReport(false)
      setReportReason('')
    } catch (err: unknown) {
      setActionError((err as Error)?.message || 'Could not submit report')
    } finally {
      setReportBusy(false)
    }
  }

  const rssHref = () => {
    const qs = new URLSearchParams()
    qs.set('include_reblogs', hideReblogs() ? '0' : '1')
    if (hideRepeatingImages()) qs.set('hide_repeating_images', '1')
    if (privateBlog() && v2session()) qs.set('v2_session', v2session()!)
    const q = qs.toString()
    return `/${slug()}/rss${q ? '?' + q : ''}`
  }

  const rssIncludesToken = () => privateBlog() && !!v2session()

  const feedActive = () =>
    location.pathname === `/${slug()}` || location.pathname === `/${slug()}/`
  const followingActive = () => location.pathname === `/${slug()}/following`
  const followersActive = () => location.pathname === `/${slug()}/followers`
  const siblingsActive = () => location.pathname === `/${slug()}/siblings`
  const activityActive = () => location.pathname === `/${slug()}/activity`
  const followerFeedActive = () =>
    location.pathname === `/${slug()}/follower-feed`
  const archiveActive = () => location.pathname === `/${slug()}/archive`

  return (
    <div class="home-page">
      <Title>{slug()} - bbdsmlr</Title>
      <Header info={`@${slug()}`} />
      {error() && <p class="error">{error()}</p>}
      <Show when={blog()}>
        {(b) => (
          <section class="blog-header">
            <AppErrorBoundary compact>
              <div class="blog-header-inner">
              {b().avatarUrl && (
                <img class="blog-avatar" src={b().avatarUrl} alt="" />
              )}
              <div class="blog-header-info">
                {b().title && <h2 class="blog-title">{b().title}</h2>}
                {b().description && (
                  <BlogDescription text={b().description!} />
                )}
                <p class="blog-stats">
                  {followersCount() ?? b().followersCount ?? 0} followers
                  {b().postsCount != null ? ` · ${b().postsCount} posts` : ''}
                </p>
              </div>
              <div class="blog-header-actions">
                <Show when={canAct()}>
                  <button
                    type="button"
                    class={followed() ? 'follow-btn active' : 'follow-btn'}
                    onClick={toggleFollow}
                    disabled={followBusy()}
                  >
                    {followBusy()
                      ? '…'
                      : followed()
                        ? 'Following'
                        : 'Follow'}
                  </button>
                  <div class="profile-actions" ref={actionsRef}>
                    <button
                      type="button"
                      class="settings-btn"
                      onClick={() => setShowActions(!showActions())}
                      aria-label="Blog actions"
                      aria-expanded={showActions()}
                    >
                      ⋯
                    </button>
                    <Show when={showActions()}>
                      <div class="settings-dropdown-menu profile-actions-menu">
                        <A
                          href={`/messages?to=${encodeURIComponent(b().name)}`}
                          class="settings-dropdown-item"
                          onClick={() => setShowActions(false)}
                        >
                          Message
                        </A>
                        <button
                          type="button"
                          class="settings-dropdown-item"
                          onClick={toggleBlock}
                          disabled={blockBusy()}
                        >
                          {blocked() ? 'Unblock' : 'Block'}
                        </button>
                        <button
                          type="button"
                          class="settings-dropdown-item"
                          onClick={() => {
                            setReportDone(false)
                            setShowReport(true)
                            setShowActions(false)
                          }}
                          disabled={reportDone()}
                        >
                          {reportDone() ? 'Reported' : 'Report blog'}
                        </button>
                      </div>
                    </Show>
                  </div>
                </Show>
                <a
                  href={`https://bdsmlr.com/blog/${slug()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="download-btn"
                  title="Open on BDSMLR"
                  onClick={() => trackEvent('outbound-bdsmlr', { surface: 'profile' })}
                >
                  <BdsmlrIcon />
                </a>
                <a
                  href={rssHref()}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="download-btn"
                  onClick={() => trackEvent('rss-open')}
                  classList={{
                    'download-btn-active': location.pathname === `/${slug()}/rss`,
                  }}
                  title="RSS feed"
                >
                  <RssIcon />
                </a>
                <Show when={rssIncludesToken()}>
                  <span
                    class="rss-token-warning"
                    title="This feed includes your session token because the blog is private. Do not share it with others or they can potentially steal your account. Saving it in an RSS reader you trust is fine, and using it with the imaglr importer tool is also fine."
                  >
                    <WarningIcon />
                  </span>
                </Show>
              </div>
            </div>
            </AppErrorBoundary>
            <Show when={actionError()}>
              <p class="action-error blog-action-error">{actionError()}</p>
            </Show>
            <Show when={signedIn()}>
              <nav class="blog-nav-tabs">
                <A
                  href={`/${slug()}`}
                  class="blog-nav-tab"
                  classList={{ 'blog-nav-tab-active': feedActive() }}
                  onClick={() => trackEvent('profile-tab', { tab: 'feed' })}
                >
                  Feed
                </A>
                <A
                  href={`/${slug()}/following`}
                  class="blog-nav-tab"
                  classList={{ 'blog-nav-tab-active': followingActive() }}
                  onClick={() => trackEvent('profile-tab', { tab: 'following' })}
                >
                  Following
                </A>
                <A
                  href={`/${slug()}/followers`}
                  class="blog-nav-tab"
                  classList={{ 'blog-nav-tab-active': followersActive() }}
                  onClick={() => trackEvent('profile-tab', { tab: 'followers' })}
                >
                  Followers
                </A>
                <A
                  href={`/${slug()}/siblings`}
                  class="blog-nav-tab"
                  classList={{ 'blog-nav-tab-active': siblingsActive() }}
                  onClick={() => trackEvent('profile-tab', { tab: 'siblings' })}
                >
                  Other blogs
                </A>
                <A
                  href={`/${slug()}/activity`}
                  class="blog-nav-tab"
                  classList={{ 'blog-nav-tab-active': activityActive() }}
                  onClick={() => trackEvent('profile-tab', { tab: 'activity' })}
                >
                  Activity
                </A>
                <A
                  href={`/${slug()}/follower-feed`}
                  class="blog-nav-tab"
                  classList={{ 'blog-nav-tab-active': followerFeedActive() }}
                  onClick={() => trackEvent('profile-tab', { tab: 'follower-feed' })}
                >
                  Followers' feed
                </A>
                <A
                  href={`/${slug()}/archive`}
                  class="blog-nav-tab"
                  classList={{ 'blog-nav-tab-active': archiveActive() }}
                  onClick={() => trackEvent('profile-tab', { tab: 'archive' })}
                >
                  Archive
                </A>
              </nav>
            </Show>
          </section>
        )}
      </Show>
      <Show when={!loading() && !error() && !blog()}>
        <section class="blog-header">
          <div class="blog-header-inner">
            <div class="blog-header-info">
              <p class="blog-description">This blog is private.</p>
            </div>
            <div class="blog-header-actions">
              <a
                href={rssHref()}
                target="_blank"
                rel="noopener noreferrer"
                class="download-btn"
                title="RSS feed"
                onClick={() => trackEvent('rss-open')}
              >
                <RssIcon />
              </a>
              <Show when={rssIncludesToken()}>
                <span
                  class="rss-token-warning"
                  title="This feed includes your session token because the blog is private. Do not share it with others or they can potentially steal your account. Saving it in an RSS reader you trust is fine, and using it with the imaglr importer tool is also fine."
                >
                  <WarningIcon />
                </span>
              </Show>
            </div>
          </div>
        </section>
      </Show>
      <AppErrorBoundary compact>
        <Show when={signedIn() || isPostView()}>
          <FeedSettingsProvider
            hideReblogs={hideReblogs}
            setHideReblogs={setHideReblogs}
            hideRepeatingImages={hideRepeatingImages}
            setHideRepeatingImages={setHideRepeatingImages}
          >
            {props.children}
          </FeedSettingsProvider>
        </Show>
      </AppErrorBoundary>

      <Show when={!signedIn() && !isPostView()}>
        <LoginGateModal next={`${location.pathname}${location.search}`} />
      </Show>

      <Show when={showReport()}>
        <div
          class="tag-modal-backdrop"
          onClick={() => {
            if (!reportBusy()) {
              setShowReport(false)
              setReportReason('')
            }
          }}
        >
          <form
            class="tag-modal report-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitReport}
          >
            <button
              type="button"
              class="tag-modal-close"
              onClick={() => {
                setShowReport(false)
                setReportReason('')
              }}
              aria-label="Close report"
              disabled={reportBusy()}
            >
              ×
            </button>
            <h3>Report @{slug()}</h3>
            <p class="report-copy">
              Tell the moderators what is wrong with this blog.
            </p>
            <textarea
              rows={4}
              placeholder="Reason"
              value={reportReason()}
              onInput={(e) => setReportReason(e.currentTarget.value)}
            />
            <button
              type="submit"
              class="danger-btn"
              disabled={!reportReason().trim() || reportBusy()}
            >
              {reportBusy() ? 'Reporting…' : 'Submit report'}
            </button>
          </form>
        </div>
      </Show>
    </div>
  )
}
