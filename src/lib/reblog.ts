export interface ReblogOptions {
  blogId: number
  originPostId?: number | null
  note?: string
  tags?: string[]
  mode?: 'live' | 'queue'
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function noteHtml(note: string | undefined): string {
  const trimmed = note?.trim()
  if (!trimmed) return ''
  return `<p>${escapeHtml(trimmed).replace(/\n/g, '<br>')}</p>`
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null)
  return data?.error || data?.message || fallback
}

export async function submitReblog(
  postId: number,
  opts: ReblogOptions,
): Promise<void> {
  const originPostId = opts.originPostId ?? postId
  const composer = await fetch(`/api/legacy/reblog/${postId}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({
      thispost: String(postId),
      orgpost: String(originPostId),
    }),
  })

  if (composer.status === 401) {
    throw new Error('Your BDSMLR sign-in expired. Sign in again to reblog.')
  }
  if (!composer.ok) {
    throw new Error(
      await errorMessage(composer, 'Could not start the reblog. Try again.'),
    )
  }

  const doc = new DOMParser().parseFromString(
    await composer.text(),
    'text/html',
  )
  if (!doc.querySelector('#selectblog')) {
    throw new Error('Your BDSMLR sign-in expired. Sign in again to reblog.')
  }

  const info = doc.querySelector('.infopost')
  const type = doc.querySelector('.type')?.getAttribute('data-type') ?? ''
  const originalId = info?.getAttribute('data-id') ?? String(postId)
  const reblogId = info?.getAttribute('data-rb') ?? String(postId)
  const sourceBlogId = doc.querySelector('.blogreblog')?.getAttribute('data-blogid') ?? ''

  const payload = new URLSearchParams({
    thispost: noteHtml(opts.note),
    blog: String(opts.blogId),
    earlier: '1',
    earliercomments: '',
    type,
    blogid: sourceBlogId,
    originalid: originalId,
    typerb: opts.mode === 'queue' ? '1' : '0',
    rbid: reblogId,
  })
  for (const tag of opts.tags ?? []) {
    const clean = tag.replace(/^#+/, '').trim()
    if (clean) payload.append('tags[]', clean)
  }

  const res = await fetch(`/api/legacy/reblogpost/${postId}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: payload,
  })

  if (res.status === 401) {
    throw new Error('Your BDSMLR sign-in expired. Sign in again to reblog.')
  }
  if (!res.ok) {
    throw new Error(await errorMessage(res, 'Could not reblog post'))
  }
}
