import { useParams } from '@solidjs/router'
import { Title } from '@solidjs/meta'
import { SocialList } from '~/components/SocialList'

export default function FollowersPage() {
  const params = useParams()
  return (
    <>
      <Title>{params.user ?? ""} followers - bbdsmlr</Title>
      <SocialList blogName={params.user ?? ""} kind="followers" />
    </>
  )
}
