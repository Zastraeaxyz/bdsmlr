import { useParams } from '@solidjs/router'
import { Title } from '@solidjs/meta'
import { FollowerFeed } from '~/components/FollowerFeed'

export default function FollowerFeedPage() {
  const params = useParams()
  const name = () => params.user ?? ''
  return (
    <>
      <Title>{name()} follower feed - bbdsmlr</Title>
      <main>
        <h2 class="social-list-title">Followers' feed</h2>
        <FollowerFeed blogName={name()} />
      </main>
    </>
  )
}
