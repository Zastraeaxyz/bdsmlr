/*
 * Turns a bbdsmlr feed into a readable settings page when a browser opens it.
 *
 * Feed readers ignore the <script> element that loads this file, so they keep
 * getting the XML. Browsers run it and get a page where the feed's query
 * parameters can be toggled and the resulting URL copied.
 *
 * The page is built with DOM calls only: no post HTML is ever injected, and
 * every link or image URL is checked for an http(s) scheme first.
 */
(function () {
  'use strict'

  var XHTML = 'http://www.w3.org/1999/xhtml'
  var PHOTO_PLACEHOLDER = 'No image'

  function start() {
    try {
      render()
    } catch (error) {
      // Leave the raw XML alone if anything goes wrong.
      console.error('[rss-viewer]', error)
    }
  }

  function render() {
    var channel = document.querySelector('rss > channel')
    if (!channel) return

    var initial = new URL(location.href)
    var state = readOptions(initial)
    var blogName = readBlogName()
    var channelTitle = readText(channel, 'title')
    var channelDescription = readText(channel, 'description')
    var homeHref = safeHttp(readText(channel, 'link'))
    var tokenInUrl = initial.searchParams.has('v2_session')
    var pageNumber = Number(initial.searchParams.get('page')) || 1

    var items = Array.from(document.querySelectorAll('channel > item'))
    var nextNode = document.querySelector("[rel='next'][href]")
    var nextUrl = safeHttp(nextNode && nextNode.getAttribute('href'))

    var heading = blogName
      ? '@' + blogName
      : channelTitle && channelTitle !== 'No title'
        ? channelTitle
        : 'RSS feed'
    var title = blogName ? heading + ' RSS feed' : 'RSS feed'

    var urlInput = el('input', {
      id: 'rss-viewer-url',
      className: 'url-input',
      type: 'text',
      readonly: true,
      spellcheck: 'false',
      'aria-label': 'Feed URL',
    })
    urlInput.value = buildUrl(state, true).href

    var reloadNote = el('p', { className: 'reload-note', hidden: true }, [
      el('span', { text: 'Settings saved in the address bar.' }),
      el('button', {
        type: 'button',
        className: 'small-button',
        onClick: function () {
          location.href = buildUrl(state, false).href
        },
      }, 'Reload to preview'),
    ])

    var copyButton = el('button', {
      type: 'button',
      className: 'primary',
      onClick: function () {
        var text = buildUrl(state, true).href
        copyText(text).then(
          function () {
            copyButton.textContent = 'Copied'
            setTimeout(function () {
              copyButton.textContent = 'Copy feed URL'
            }, 1500)
          },
          function () {
            urlInput.focus()
            urlInput.select()
          },
        )
      },
    }, 'Copy feed URL')

    function commit() {
      var preview = buildUrl(state, false)
      try {
        history.replaceState(null, '', preview.pathname + preview.search + preview.hash)
      } catch (error) {
        // Some XML viewers refuse history changes. The copy field still works.
      }
      urlInput.value = buildUrl(state, true).href
      reloadNote.hidden = false
      if (nextUrl) nextLink.setAttribute('href', withOptions(nextUrl, state).href)
    }

    var includeReblogs = option(
      'Include reblogs',
      'Show posts this blog reblogged from other blogs, not just its own.',
      state.includeReblogs,
      function (checked) {
        state.includeReblogs = checked
        commit()
      },
    )
    var hideRepeating = option(
      'Hide repeating images',
      'BDSMLR sometimes includes the same image in many posts. This removes images shared by the three newest image posts.',
      state.hideRepeatingImages,
      function (checked) {
        state.hideRepeatingImages = checked
        commit()
      },
    )
    var imagesOnly = option(
      'Images only',
      'Keep only posts that contain an image, and drop video and audio attachments. Useful for image importers.',
      state.imagesOnly,
      function (checked) {
        state.imagesOnly = checked
        commit()
      },
    )
    var zastraea = option(
      'Open links in bbdsmlr',
      'Point post, tag, and blog links at bdsmlr.zastraea.xyz instead of bdsmlr.com.',
      state.zastraea,
      function (checked) {
        state.zastraea = checked
        commit()
      },
    )

    var nextLink = el('a', {
      href: nextUrl ? withOptions(nextUrl, state).href : undefined,
      className: 'pager-link',
    }, 'Older posts \u2192')

    var pager = nextUrl
      ? el('nav', { className: 'pager', 'aria-label': 'Feed pages' }, [nextLink])
      : null

    var pageNote = pageNumber > 1
      ? el('p', {
          className: 'hint',
          text: 'You are viewing page ' + pageNumber + '. The feed URL above starts at the newest posts.',
        })
      : null

    var root = el('html', { lang: 'en' }, [
      el('head', null, [
        el('meta', { charset: 'utf-8' }),
        el('meta', {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        }),
        el('title', { text: title }),
        el('link', { rel: 'icon', href: '/favicon.png', type: 'image/png' }),
        el('style', { text: CSS }),
      ]),
      el('body', null, [
        el('main', { className: 'wrap' }, [
          el('div', { className: 'brand' }, [
            el('a', { href: '/', className: 'brand-link' }, [
              el('img', { src: '/favicon.png', alt: '', width: '20', height: '20' }),
              el('span', { text: 'bbdsmlr' }),
            ]),
            el('span', { className: 'brand-tag', text: 'RSS feed' }),
          ]),
          el('header', { className: 'masthead' }, [
            el('div', { className: 'masthead-copy' }, [
              el('h1', { text: heading }),
              channelTitle && channelTitle !== heading && channelTitle !== 'No title'
                ? el('p', { className: 'channel-title', text: channelTitle })
                : null,
              channelDescription &&
              channelDescription !== 'No Description' &&
              channelDescription !== 'No description'
                ? el('p', { className: 'lede', text: channelDescription })
                : null,
              el('p', {
                className: 'reader-note',
                text: 'This is an RSS feed. Browsers get this page; feed readers get the XML.',
              }),
            ]),
            homeHref
              ? el('a', {
                  className: 'button',
                  href: homeHref,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                }, 'Open blog')
              : null,
          ]),

          el('section', { className: 'card' }, [
            el('h2', { text: 'Feed URL' }),
            el('div', { className: 'copy-row' }, [urlInput, copyButton]),
            el('p', {
              className: 'hint',
              text: 'Paste this into your feed reader or importer. The options below are saved in the URL.',
            }),
            pageNote,
            tokenInUrl
              ? el('div', { className: 'warning', role: 'note' }, [
                  el('strong', { text: 'Private blog: never share this URL' }),
                  el('p', {
                    text: 'This feed URL contains your BDSMLR session token so your feed reader can sign in to a private blog. Anyone who has this URL could use that token to access or take over your account. Do not post it, send it to anyone, or show it in a screenshot or stream.',
                  }),
                ])
              : null,
          ]),

          el('section', { className: 'card' }, [
            el('h2', { text: 'Feed options' }),
            el('div', { className: 'options' }, [
              includeReblogs,
              hideRepeating,
              imagesOnly,
              zastraea,
            ]),
            reloadNote,
          ]),

          el('section', { className: 'card' }, [
            el('div', { className: 'card-head' }, [
              el('h2', { text: 'Latest posts' }),
              el('span', {
                className: 'hint',
                text: items.length === 1 ? '1 item' : items.length + ' items',
              }),
            ]),
            items.length > 0
              ? el('ul', { className: 'items' }, items.map(renderItem))
              : el('p', {
                  className: 'hint',
                  text: state.imagesOnly
                    ? 'No image posts on this page. Try the next page.'
                    : 'No posts on this page.',
                }),
            pager,
          ]),

          el('footer', { className: 'footer' }, [
            el('p', { className: 'hint' }, [
              el('a', { href: '/about#rss-feeds', text: 'About RSS feeds in bbdsmlr' }),
              el('span', { text: ' \u00b7 ' }),
              el('span', { text: 'Feed readers never see this page.' }),
            ]),
          ]),
        ]),
      ]),
    ])

    document.documentElement.replaceWith(root)
  }

  function renderItem(item) {
    var title = readText(item, 'title') || 'Untitled post'
    var href = safeHttp(readText(item, 'link'))
    var date = formatDate(readText(item, 'pubDate'))
    var excerpt = textExcerpt(readText(item, 'description'))

    var enclosure = item.querySelector('enclosure')
    var mediaUrl = safeHttp(enclosure && enclosure.getAttribute('url'))
    var mediaType = (enclosure && enclosure.getAttribute('type')) || ''
    var isVideo =
      mediaType.indexOf('video/') === 0 ||
      /\.(mp4|webm|ogv|mov|avi|mkv)(\?|$)/i.test(mediaUrl || '')

    var thumb
    if (mediaUrl && isVideo) {
      thumb = el('span', { className: 'thumb' }, [
        el('video', {
          src: mediaUrl,
          muted: true,
          playsinline: true,
          preload: 'none',
          'aria-hidden': 'true',
        }),
        el('span', { className: 'badge', text: 'Video' }),
      ])
    } else if (mediaUrl) {
      var img = el('img', { src: mediaUrl, alt: '', loading: 'lazy' })
      img.addEventListener('error', function () {
        thumb.setAttribute('class', 'thumb thumb-empty')
        thumb.textContent = 'Image unavailable'
      })
      thumb = el('span', { className: 'thumb' }, [img])
    } else {
      thumb = el('span', { className: 'thumb thumb-empty', text: PHOTO_PLACEHOLDER })
    }

    var meta = [date, excerpt].filter(Boolean).join(' \u00b7 ')

    return el('li', { className: 'item' }, [
      href
        ? el('a', {
            className: 'thumb-link',
            href: href,
            target: '_blank',
            rel: 'noopener noreferrer',
            'aria-label': title,
          }, [thumb])
        : thumb,
      el('div', { className: 'item-body' }, [
        href
          ? el('a', {
              className: 'item-title',
              href: href,
              target: '_blank',
              rel: 'noopener noreferrer',
              text: title,
            })
          : el('span', { className: 'item-title', text: title }),
        meta ? el('p', { className: 'item-meta', text: meta }) : null,
      ]),
    ])
  }

  function option(label, description, checked, onChange) {
    var input = el('input', { type: 'checkbox', checked: checked })
    input.addEventListener('change', function () {
      onChange(input.checked)
    })
    return el('label', { className: 'option' }, [
      input,
      el('span', { className: 'option-copy' }, [
        el('strong', { text: label }),
        el('small', { text: description }),
      ]),
    ])
  }

  function readBlogName() {
    var parts = location.pathname.split('/').filter(Boolean)
    var at = parts.indexOf('rss')
    var name = ''
    if (at === parts.length - 1 && at > 0) name = parts[at - 1]
    else if (at !== -1 && parts.length > at + 1) name = parts[at + 1]
    try {
      return decodeURIComponent(name)
    } catch (error) {
      return name
    }
  }

  function readOptions(url) {
    return {
      includeReblogs: url.searchParams.get('include_reblogs') === '1',
      hideRepeatingImages: url.searchParams.get('hide_repeating_images') === '1',
      imagesOnly: url.searchParams.get('images_only') === '1',
      zastraea: url.searchParams.get('zastraea') === 'true',
    }
  }

  function buildUrl(state, dropPage) {
    var url = new URL(location.href)
    if (dropPage) url.searchParams.delete('page')
    return withOptions(url, state)
  }

  function withOptions(url, state) {
    var next = new URL(String(url), location.href)
    setParam(next, 'include_reblogs', state.includeReblogs ? '1' : '0')
    setParam(next, 'hide_repeating_images', state.hideRepeatingImages ? '1' : null)
    setParam(next, 'images_only', state.imagesOnly ? '1' : null)
    setParam(next, 'zastraea', state.zastraea ? 'true' : null)
    return next
  }

  function setParam(url, name, value) {
    if (value === null) url.searchParams.delete(name)
    else url.searchParams.set(name, value)
  }

  function readText(parent, selector) {
    var node = parent.querySelector(selector)
    return node ? (node.textContent || '').trim() : ''
  }

  function safeHttp(value) {
    if (!value) return null
    try {
      var url = new URL(value, location.href)
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
    } catch (error) {
      return null
    }
  }

  function formatDate(value) {
    if (!value) return ''
    var date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    try {
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch (error) {
      return value
    }
  }

  /**
   * Post descriptions are HTML strings. Parse them in an inert document so
   * only their text ever reaches this page.
   */
  function textExcerpt(html) {
    if (!html || html.indexOf('<') === -1) return html.trim()
    try {
      var doc = new DOMParser().parseFromString(html, 'text/html')
      var text = ((doc.body && doc.body.textContent) || '').replace(/\s+/g, ' ').trim()
      return text.length > 180 ? text.slice(0, 180) + '\u2026' : text
    } catch (error) {
      return ''
    }
  }

  function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(value)
    }
    return new Promise(function (resolve, reject) {
      var area = el('textarea', { readonly: true })
      area.value = value
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      try {
        var ok = document.execCommand('copy')
        area.remove()
        if (ok) resolve()
        else reject(new Error('copy failed'))
      } catch (error) {
        area.remove()
        reject(error)
      }
    })
  }

  function el(tag, attrs, children) {
    var node = document.createElementNS(XHTML, tag)
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key]
        if (value === null || value === undefined || value === false) return
        if (key === 'text') {
          node.textContent = String(value)
        } else if (key === 'className') {
          node.setAttribute('class', String(value))
        } else if (key === 'onClick') {
          node.addEventListener('click', value)
        } else {
          node.setAttribute(key, value === true ? '' : String(value))
        }
      })
    }
    appendChildren(node, children)
    return node
  }

  function appendChildren(node, children) {
    if (children === null || children === undefined || children === false) return
    if (Array.isArray(children)) {
      children.forEach(function (child) {
        appendChildren(node, child)
      })
    } else if (typeof children === 'string' || typeof children === 'number') {
      node.appendChild(document.createTextNode(String(children)))
    } else {
      node.appendChild(children)
    }
  }

  var CSS = [
    ':root {',
    '  color-scheme: dark;',
    '  --bg: #0d1117;',
    '  --card: #161b22;',
    '  --hover: #1c2129;',
    '  --text: #c9d1d9;',
    '  --heading: #e6edf3;',
    '  --muted: #8b949e;',
    '  --border: #30363d;',
    '  --accent: #58a6ff;',
    '  --warning-bg: rgba(210, 153, 34, 0.12);',
    '  --warning-border: rgba(210, 153, 34, 0.45);',
    '}',
    '* { box-sizing: border-box; }',
    'html { background: var(--bg); }',
    'body {',
    '  margin: 0;',
    '  background: var(--bg);',
    '  color: var(--text);',
    '  font: 16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;',
    '  -webkit-font-smoothing: antialiased;',
    '}',
    'a { color: var(--accent); text-decoration: none; }',
    'a:hover { text-decoration: underline; }',
    '[hidden] { display: none !important; }',
    '.wrap { max-width: 880px; margin: 0 auto; padding: 28px 20px 72px; }',
    '.brand { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }',
    '.brand-link { display: inline-flex; align-items: center; gap: 8px; color: var(--heading); font-weight: 700; }',
    '.brand-link img { border-radius: 5px; }',
    '.brand-tag {',
    '  font-size: 12px;',
    '  text-transform: uppercase;',
    '  letter-spacing: 0.08em;',
    '  color: var(--muted);',
    '  border: 1px solid var(--border);',
    '  border-radius: 999px;',
    '  padding: 2px 9px;',
    '}',
    '.masthead { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }',
    '.masthead-copy { min-width: 0; }',
    'h1 { margin: 0; color: var(--heading); font-size: clamp(26px, 4vw, 34px); line-height: 1.2; }',
    '.channel-title { margin: 4px 0 0; color: var(--heading); font-size: 17px; }',
    '.lede { margin: 8px 0 0; color: var(--text); }',
    '.reader-note { margin: 14px 0 0; color: var(--muted); font-size: 14px; }',
    '.button {',
    '  flex: 0 0 auto;',
    '  display: inline-flex;',
    '  align-items: center;',
    '  white-space: nowrap;',
    '  border: 1px solid var(--border);',
    '  background: var(--hover);',
    '  color: var(--heading);',
    '  border-radius: 8px;',
    '  padding: 9px 14px;',
    '  font-size: 14px;',
    '  font-weight: 600;',
    '}',
    '.button:hover { background: #222833; text-decoration: none; }',
    '.card {',
    '  margin-top: 20px;',
    '  padding: 18px;',
    '  background: var(--card);',
    '  border: 1px solid var(--border);',
    '  border-radius: 12px;',
    '}',
    '.card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }',
    'h2 {',
    '  margin: 0 0 12px;',
    '  color: var(--muted);',
    '  font-size: 12px;',
    '  font-weight: 700;',
    '  letter-spacing: 0.09em;',
    '  text-transform: uppercase;',
    '}',
    '.copy-row { display: flex; gap: 8px; }',
    '.url-input {',
    '  flex: 1 1 auto;',
    '  min-width: 0;',
    '  padding: 9px 12px;',
    '  color: var(--text);',
    '  background: var(--bg);',
    '  border: 1px solid var(--border);',
    '  border-radius: 8px;',
    '  font: 13px/1.4 ui-monospace, "SF Mono", Consolas, monospace;',
    '}',
    '.url-input:focus { outline: 2px solid rgba(88, 166, 255, 0.4); outline-offset: 1px; }',
    'button {',
    '  appearance: none;',
    '  border: 1px solid var(--border);',
    '  background: var(--hover);',
    '  color: var(--heading);',
    '  font: inherit;',
    '  font-size: 14px;',
    '  font-weight: 600;',
    '  border-radius: 8px;',
    '  padding: 9px 14px;',
    '  cursor: pointer;',
    '}',
    'button:hover { background: #222833; }',
    'button.primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }',
    'button.primary:hover { background: #388bfd; }',
    '.small-button { padding: 6px 10px; font-size: 13px; }',
    '.hint { margin: 10px 0 0; color: var(--muted); font-size: 13px; }',
    '.card-head .hint { margin: 0; }',
    '.warning {',
    '  margin-top: 14px;',
    '  padding: 12px 14px;',
    '  background: var(--warning-bg);',
    '  border: 1px solid var(--warning-border);',
    '  border-radius: 10px;',
    '  color: #f0c674;',
    '  font-size: 14px;',
    '}',
    '.warning strong { display: block; margin-bottom: 4px; color: #ffd479; }',
    '.warning p { margin: 0; }',
    '.options { display: grid; gap: 10px; }',
    '.option {',
    '  display: flex;',
    '  gap: 12px;',
    '  padding: 12px;',
    '  background: var(--bg);',
    '  border: 1px solid var(--border);',
    '  border-radius: 10px;',
    '  cursor: pointer;',
    '}',
    '.option:hover { border-color: #3d444d; }',
    '.option input { flex: 0 0 auto; width: 18px; height: 18px; margin: 3px 0 0; accent-color: var(--accent); }',
    '.option-copy { min-width: 0; }',
    '.option strong { display: block; color: var(--heading); font-weight: 600; }',
    '.option small { display: block; margin-top: 2px; color: var(--muted); font-size: 13px; }',
    '.reload-note {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 12px;',
    '  margin: 14px 0 0;',
    '  color: var(--muted);',
    '  font-size: 14px;',
    '}',
    '.items { list-style: none; margin: 0; padding: 0; }',
    '.item { display: flex; gap: 14px; padding: 12px 0; border-top: 1px solid var(--border); }',
    '.item:first-child { border-top: 0; padding-top: 4px; }',
    '.thumb-link { flex: 0 0 auto; }',
    '.thumb {',
    '  position: relative;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  width: 96px;',
    '  height: 96px;',
    '  overflow: hidden;',
    '  background: #0b0f14;',
    '  border: 1px solid var(--border);',
    '  border-radius: 8px;',
    '}',
    '.thumb img, .thumb video { display: block; width: 100%; height: 100%; object-fit: cover; }',
    '.thumb-empty { color: var(--muted); font-size: 11px; text-align: center; padding: 6px; }',
    '.badge {',
    '  position: absolute;',
    '  left: 6px;',
    '  bottom: 6px;',
    '  padding: 1px 6px;',
    '  background: rgba(0, 0, 0, 0.72);',
    '  border-radius: 4px;',
    '  color: #fff;',
    '  font-size: 11px;',
    '  font-weight: 600;',
    '}',
    '.item-body { min-width: 0; padding-top: 2px; }',
    '.item-title { color: var(--heading); font-weight: 600; font-size: 15px; }',
    '.item-meta { margin: 4px 0 0; color: var(--muted); font-size: 13px; }',
    '.pager { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border); }',
    '.pager-link { font-size: 14px; font-weight: 600; }',
    '.footer { margin-top: 28px; }',
    '.footer .hint { margin: 0; }',
    '@media (max-width: 560px) {',
    '  .masthead { flex-direction: column; }',
    '  .copy-row { flex-direction: column; }',
    '  .thumb { width: 72px; height: 72px; }',
    '  .wrap { padding: 20px 14px 56px; }',
    '}',
  ].join('\n')

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true })
  } else {
    start()
  }
})()
