import { createSignal, createEffect, on, Show, type ParentProps } from 'solid-js'
import { useParams, useLocation, A } from '@solidjs/router'
import { Title } from '@solidjs/meta'
import { resolveIdentifier, getBlog, type Blog } from '~/lib/api'
import Header from '~/components/Header'
import { BdsmlrIcon, RssIcon, WarningIcon } from '~/components/Icons'
import { FeedSettingsProvider } from '~/lib/feedSettings'
import { useAuth } from '~/lib/useAuth'

export default function UserLayout(props: ParentProps) {
  const params = useParams()
  const slug = () => params.user
  const location = useLocation()
  const { user } = useAuth()

  const [blog, setBlog] = createSignal<Blog | null>(null)
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal('')
  const [hideReblogs, setHideReblogs] = createSignal(false)
  const [privateBlog, setPrivateBlog] = createSignal(false)
  const [v2session, setV2session] = createSignal<string | null>(null)

  createEffect(() => {
    const name = slug()
    if (!name) return
    setLoading(true)
    setError('')
    resolveIdentifier(name).then((resolved) => {
      if (!resolved.blogId) {
        setError(resolved.error || 'User not found')
        setLoading(false)
        return
      }
      getBlog(resolved.blogId).then((res) => {
        setBlog(res.blog ?? null)
        setLoading(false)
      })
    })
  })

  createEffect(
    on(
      () => slug(),
      (name) => {
        if (!name) return
        setPrivateBlog(false)
        setV2session(null)
        if (!user()?.blog_id) return
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

  const rssHref = () => {
    const qs = new URLSearchParams()
    qs.set('include_reblogs', hideReblogs() ? '0' : '1')
    if (privateBlog() && v2session()) qs.set('v2_session', v2session()!)
    const q = qs.toString()
    return `/${slug()}/rss${q ? '?' + q : ''}`
  }

  const rssIncludesToken = () => privateBlog() && !!v2session()

  return (
    <div class="home-page">
      <Title>{slug()} — bbdsmlr</Title>
      <Header info={`@${slug()}`} />
      {error() && <p class="error">{error()}</p>}
      <Show when={blog()}>
        {(b) => (
          <section class="blog-header">
            <div class="blog-header-inner">
              {b().avatarUrl && (
                <img class="blog-avatar" src={b().avatarUrl} alt="" />
              )}
              <div class="blog-header-info">
                {b().title && <h2 class="blog-title">{b().title}</h2>}
                {b().description && (
                  <p class="blog-description">{b().description}</p>
                )}
                <div style="display:flex;gap:12px;margin-top:8px">
                  <a
                    href={`https://bdsmlr.com/blog/${slug()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="download-btn"
                    title="Open on BDSMLR"
                  >
                    <BdsmlrIcon />
                  </a>
                  <A
                    href={`/${slug()}`}
                    class="download-btn"
                    classList={{ 'download-btn-active': location.pathname === `/${slug()}` }}
                    title="Feed"
                  >
                    Feed
                  </A>
                  <A
                    href={`/${slug()}/following`}
                    class="download-btn"
                    classList={{ 'download-btn-active': location.pathname === `/${slug()}/following` }}
                    title="Following"
                  >
                    Following
                  </A>
                  <a
                    href={rssHref()}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="download-btn"
                    classList={{ 'download-btn-active': location.pathname === `/${slug()}/rss` }}
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
            </div>
          </section>
        )}
      </Show>
      <Show when={!loading() && !error() && !blog()}>
        <section class="blog-header">
          <div class="blog-header-inner">
            <div class="blog-header-info">
              <p class="blog-description">This blog is private.</p>
              <div style="display:flex;gap:12px;margin-top:8px">
                <a
                  href={rssHref()}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="download-btn"
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
          </div>
        </section>
      </Show>
      <FeedSettingsProvider hideReblogs={hideReblogs} setHideReblogs={setHideReblogs}>
        {props.children}
      </FeedSettingsProvider>
    </div>
  )
}
