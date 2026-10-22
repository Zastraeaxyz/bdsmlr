import { useParams } from '@solidjs/router'
import { Title } from '@solidjs/meta'
import { SocialList } from '~/components/SocialList'

export default function FollowingPage() {
  const params = useParams()
  return (
    <>
      <Title>{params.user ?? ""} following - bbdsmlr</Title>
      <SocialList blogName={params.user ?? ""} kind="following" />
    </>
  )
}
