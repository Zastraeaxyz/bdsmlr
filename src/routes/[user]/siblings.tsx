import { useParams } from '@solidjs/router'
import { Title } from '@solidjs/meta'
import { SocialList } from '~/components/SocialList'

export default function SiblingsPage() {
  const params = useParams()
  return (
    <>
      <Title>{params.user ?? ""} blogs - bbdsmlr</Title>
      <SocialList blogName={params.user ?? ""} kind="siblings" />
    </>
  )
}
