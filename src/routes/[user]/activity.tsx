import { useParams } from '@solidjs/router'
import { Title } from '@solidjs/meta'
import { ActivityFeed } from '~/components/ActivityFeed'

export default function ActivityPage() {
  const params = useParams()
  const name = () => params.user ?? ''
  return (
    <>
      <Title>{name()} activity - bbdsmlr</Title>
      <main>
        <h2 class="social-list-title">Activity</h2>
        <ActivityFeed blogName={name()} />
      </main>
    </>
  )
}
