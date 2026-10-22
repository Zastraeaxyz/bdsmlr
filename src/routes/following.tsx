import { createEffect } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { useAuth } from '~/lib/useAuth'

export default function FollowingRedirect() {
  const navigate = useNavigate()
  const { user, loading, activeBlog } = useAuth()

  createEffect(() => {
    if (loading()) return
    if (!user()) {
      navigate('/login', { replace: true })
    } else {
      navigate(`/${activeBlog()?.name ?? user()!.blog_name}/following`, { replace: true })
    }
  })

  return null
}
