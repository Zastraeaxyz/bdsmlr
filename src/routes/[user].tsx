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
  AlertTriangle,
  Ban,
  Flag,
  MessageSquare,
  MoreHorizontal,
} from 'lucide-solid'
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
import { BdsmlrIcon, RssIcon } from '~/components/Icons'
import { BlogDescription } from '~/components/BlogDescription'
import { AppErrorBoundary } from '~/components/AppErrorBoundary'
import { FeedSettingsProvider } from '~/lib/feedSettings'
import { useAuth } from '~/lib/useAuth'
import {
  addCachedFollowingId,
  removeCachedFollowingId,
} from '~/lib/following'
import { rememberBlogAvatar } from '~/lib/blogAvatar'
import { trackEvent } from '~/lib/analytics'
import { cx } from '~/lib/cva'
import { sheetDialogClass } from '~/lib/ui'
import { Alert, AlertDescription } from '~/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPortal,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Button, buttonVariants } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  TextField,
  TextFieldTextArea,
} from '~/components/ui/text-field'
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipTrigger,
} from '~/components/ui/tooltip'

const DEFAULT_FAVICON = '/favicon.png'

const RSS_TOKEN_TITLE =
  'This feed includes your session token because the blog is private. Do not share it with others or they can potentially steal your account. Saving it in an RSS reader you trust is fine, and using it with the imaglr importer tool is also fine.'

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

function ProfileTab(props: {
  href: string
  active: boolean
  label: string
  tab: string
}) {
  return (
    <A
      href={props.href}
      class={cx(
        'inline-flex min-h-11 shrink-0 items-center justify-center border-b-2 px-3 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
        props.active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
      )}
      aria-current={props.active ? 'page' : undefined}
      onClick={() => trackEvent('profile-tab', { tab: props.tab })}
    >
      {props.label}
    </A>
  )
}

export default function UserLayout(props: ParentProps) {
  const params = useParams()
  const slug = () => params.user
  const location = useLocation()
  const { user, activeBlogId } = useAuth()

  const [blog, setBlog] = createSignal<Blog | null>(null)
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal('')
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
  const [confirmState, setConfirmState] = createSignal<{
    title: string
    description: string
    action: string
  } | null>(null)
  let actionsRef: HTMLDivElement | undefined
  let pendingConfirm: ((ok: boolean) => void) | undefined

  const askConfirm = (options: {
    title: string
    description: string
    action: string
  }) =>
    new Promise<boolean>((resolve) => {
      pendingConfirm = resolve
      setConfirmState(options)
    })

  const settleConfirm = (ok: boolean) => {
    const resolve = pendingConfirm
    pendingConfirm = undefined
    setConfirmState(null)
    resolve?.(ok)
  }

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
    const target = e.target as Node | null
    if (!target) return
    const element = target as Element
    if (element.closest?.('[data-slot="dropdown-menu-content"]')) return
    if (actionsRef && !actionsRef.contains(target)) {
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
        rememberBlogAvatar(resolved.blogId, res.blog?.avatarUrl)
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
        settleConfirm(false)
        setShowReport(false)
        setReportDone(false)
        setReportReason('')
        setFollowed(false)
        setBlocked(false)
        if (!activeBlogId()) return
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
    const confirmed = await askConfirm({
      title: next
        ? `Block @${current.name} and the owner's other blogs?`
        : `Unblock @${current.name}?`,
      description: next
        ? 'They will no longer be able to interact with you.'
        : 'They will be able to follow and message you again.',
      action: next ? 'Block' : 'Unblock',
    })
    if (!confirmed) return
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
    qs.set('include_reblogs', '1')
    if (hideRepeatingImages()) qs.set('hide_repeating_images', '1')
    if (privateBlog() && v2session()) qs.set('v2_session', v2session()!)
    const q = qs.toString()
    return `/${slug()}/rss${q ? '?' + q : ''}`
  }

  const rssIncludesToken = () => privateBlog() && !!v2session()

  const rssActive = () => location.pathname === `/${slug()}/rss`

  const feedActive = () =>
    location.pathname === `/${slug()}` || location.pathname === `/${slug()}/`
  const followingActive = () => location.pathname === `/${slug()}/following`
  const followersActive = () => location.pathname === `/${slug()}/followers`
  const siblingsActive = () => location.pathname === `/${slug()}/siblings`
  const activityActive = () => location.pathname === `/${slug()}/activity`
  const followerFeedActive = () =>
    location.pathname === `/${slug()}/follower-feed`
  const archiveActive = () => location.pathname === `/${slug()}/archive`

  const rssWarning = () => (
    <Show when={rssIncludesToken()}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          class="inline-flex size-11 items-center justify-center text-amber-500 sm:size-9"
          aria-label="This feed includes your session token"
        >
          <AlertTriangle class="size-4" />
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent class="max-w-64">{RSS_TOKEN_TITLE}</TooltipContent>
        </TooltipPortal>
      </Tooltip>
    </Show>
  )

  return (
    <div class="flex min-h-dvh flex-col">
      <Title>{slug()} - bbdsmlr</Title>
      <Header info={`@${slug()}`} />
      <Show when={error()}>
        <Alert
          variant="destructive"
          class="mx-auto mt-4 w-[calc(100%-1.5rem)] max-w-3xl"
        >
          <AlertTriangle class="size-4" />
          <AlertDescription>{error()}</AlertDescription>
        </Alert>
      </Show>
      <Show when={blog()}>
        {(b) => (
          <section class="border-b border-border bg-card">
            <AppErrorBoundary compact>
              <div class="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:gap-4">
                <div class="flex min-w-0 flex-1 items-start gap-3">
                  <Show when={b().avatarUrl}>
                    <img
                      class="size-16 shrink-0 rounded-full border-2 border-border object-cover"
                      src={b().avatarUrl}
                      alt=""
                    />
                  </Show>
                  <div class="min-w-0 flex-1 space-y-1">
                    <Show when={b().title}>
                      <h2 class="text-lg leading-tight font-bold text-foreground">
                        {b().title}
                      </h2>
                    </Show>
                    <Show when={b().description}>
                      <BlogDescription text={b().description!} />
                    </Show>
                    <p class="pt-1 text-xs text-muted-foreground">
                      {followersCount() ?? b().followersCount ?? 0} followers
                      {b().postsCount != null
                        ? ` · ${b().postsCount} posts`
                        : ''}
                    </p>
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
                  <Show when={canAct()}>
                    <Button
                      type="button"
                      variant={followed() ? 'outline' : 'default'}
                      class="h-11 min-w-24 rounded-full px-5 sm:h-9"
                      onClick={toggleFollow}
                      disabled={followBusy()}
                      aria-pressed={followed()}
                    >
                      {followBusy()
                        ? '…'
                        : followed()
                          ? 'Following'
                          : 'Follow'}
                    </Button>
                    <div ref={actionsRef}>
                      <DropdownMenu
                        open={showActions()}
                        onOpenChange={setShowActions}
                      >
                        <DropdownMenuTrigger<typeof Button>
                          as={(triggerProps) => (
                            <Button
                              {...triggerProps}
                              type="button"
                              variant="outline"
                              size="icon"
                              class="size-11 sm:size-9"
                              aria-label="Blog actions"
                            >
                              <MoreHorizontal class="size-4" />
                            </Button>
                          )}
                        />
                        <DropdownMenuPortal>
                          <DropdownMenuContent class="w-48">
                            <DropdownMenuItem
                              as={A}
                              href={`/messages?to=${encodeURIComponent(b().name)}`}
                              onSelect={() => setShowActions(false)}
                            >
                              <MessageSquare class="size-4" />
                              Message
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={blockBusy()}
                              onSelect={() => void toggleBlock()}
                            >
                              <Ban class="size-4" />
                              {blocked() ? 'Unblock' : 'Block'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={reportDone()}
                              onSelect={() => {
                                setReportDone(false)
                                setShowReport(true)
                                setShowActions(false)
                              }}
                            >
                              <Flag class="size-4" />
                              {reportDone() ? 'Reported' : 'Report blog'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenuPortal>
                      </DropdownMenu>
                    </div>
                  </Show>
                  <a
                    href={`https://bdsmlr.com/blog/${slug()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    class={cx(
                      buttonVariants({ variant: 'outline', size: 'icon' }),
                      'size-11 sm:size-9',
                    )}
                    title="Open on BDSMLR"
                    aria-label="Open on BDSMLR"
                    onClick={() =>
                      trackEvent('outbound-bdsmlr', { surface: 'profile' })
                    }
                  >
                    <BdsmlrIcon />
                  </a>
                  <a
                    href={rssHref()}
                    target="_blank"
                    rel="noopener noreferrer"
                    class={cx(
                      buttonVariants({
                        variant: rssActive() ? 'secondary' : 'outline',
                        size: 'icon',
                      }),
                      'size-11 sm:size-9',
                      rssActive() && 'border-primary text-primary',
                    )}
                    onClick={() => trackEvent('rss-open')}
                    title="RSS feed options"
                    aria-label="RSS feed options"
                  >
                    <RssIcon />
                  </a>
                  {rssWarning()}
                </div>
              </div>
            </AppErrorBoundary>
            <Show when={actionError()}>
              <div class="mx-auto w-full max-w-3xl px-4">
                <Alert variant="destructive" class="mb-3">
                  <AlertTriangle class="size-4" />
                  <AlertDescription>{actionError()}</AlertDescription>
                </Alert>
              </div>
            </Show>
            <nav class="mx-auto flex w-full max-w-3xl gap-1 overflow-x-auto px-2">
              <ProfileTab
                href={`/${slug()}`}
                active={feedActive()}
                label="Feed"
                tab="feed"
              />
              <ProfileTab
                href={`/${slug()}/following`}
                active={followingActive()}
                label="Following"
                tab="following"
              />
              <ProfileTab
                href={`/${slug()}/followers`}
                active={followersActive()}
                label="Followers"
                tab="followers"
              />
              <ProfileTab
                href={`/${slug()}/siblings`}
                active={siblingsActive()}
                label="Other blogs"
                tab="siblings"
              />
              <ProfileTab
                href={`/${slug()}/activity`}
                active={activityActive()}
                label="Activity"
                tab="activity"
              />
              <ProfileTab
                href={`/${slug()}/follower-feed`}
                active={followerFeedActive()}
                label="Followers' feed"
                tab="follower-feed"
              />
              <ProfileTab
                href={`/${slug()}/archive`}
                active={archiveActive()}
                label="Archive"
                tab="archive"
              />
            </nav>
          </section>
        )}
      </Show>
      <Show when={!loading() && !error() && !blog()}>
        <section class="border-b border-border bg-card">
          <div class="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-3 px-4 py-4">
            <p class="min-w-0 flex-1 text-sm text-muted-foreground">
              This blog is private.
            </p>
            <div class="flex items-center gap-2">
              <a
                href={rssHref()}
                target="_blank"
                rel="noopener noreferrer"
                class={cx(
                  buttonVariants({ variant: 'outline', size: 'icon' }),
                  'size-11 sm:size-9',
                )}
                title="RSS feed options"
                aria-label="RSS feed options"
                onClick={() => trackEvent('rss-open')}
              >
                <RssIcon />
              </a>
              {rssWarning()}
            </div>
          </div>
        </section>
      </Show>
      <AppErrorBoundary compact>
        <FeedSettingsProvider
          hideRepeatingImages={hideRepeatingImages}
          setHideRepeatingImages={setHideRepeatingImages}
        >
          {props.children}
        </FeedSettingsProvider>
      </AppErrorBoundary>

      <Dialog
        open={showReport()}
        onOpenChange={(open) => {
          if (!open) {
            if (reportBusy()) return
            setShowReport(false)
            setReportReason('')
          }
        }}
      >
        <DialogPortal>
          <DialogContent class={cx(sheetDialogClass, 'sm:max-w-md')}>
            <DialogHeader>
              <DialogTitle>Report @{slug()}</DialogTitle>
              <DialogDescription>
                Tell the moderators what is wrong with this blog.
              </DialogDescription>
            </DialogHeader>
            <form class="flex flex-col gap-3" onSubmit={submitReport}>
              <TextField>
                <TextFieldTextArea
                  rows={4}
                  placeholder="Reason"
                  value={reportReason()}
                  onInput={(e) => setReportReason(e.currentTarget.value)}
                  class="min-h-28"
                />
              </TextField>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  class="h-11 sm:h-9"
                  onClick={() => {
                    if (reportBusy()) return
                    setShowReport(false)
                    setReportReason('')
                  }}
                  disabled={reportBusy()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  class="h-11 sm:h-9"
                  disabled={!reportReason().trim() || reportBusy()}
                >
                  {reportBusy() ? 'Reporting…' : 'Submit report'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <AlertDialog
        open={!!confirmState()}
        onOpenChange={(open) => {
          if (!open) settleConfirm(false)
        }}
      >
        <AlertDialogPortal>
          <AlertDialogContent class={cx(sheetDialogClass, 'sm:max-w-md')}>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmState()?.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmState()?.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                class="h-11 sm:h-9"
                onClick={() => settleConfirm(false)}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                class={buttonVariants({
                  variant: 'destructive',
                  class: 'h-11 sm:h-9',
                })}
                onClick={() => settleConfirm(true)}
              >
                {confirmState()?.action}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>
    </div>
  )
}
