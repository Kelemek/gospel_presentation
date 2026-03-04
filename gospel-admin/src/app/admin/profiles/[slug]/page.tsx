import { ProfileEditPage } from './ProfileEditPageClient'

export { ProfileEditPage }

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function ProfilePage({ params }: PageProps) {
  const { slug } = await params
  return <ProfileEditPage slug={slug} />
}
