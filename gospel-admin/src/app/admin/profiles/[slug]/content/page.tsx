import { ContentEditPage } from './ContentEditPageClient'

export { ContentEditPage }

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function ContentPage({ params }: PageProps) {
  const { slug } = await params
  return <ContentEditPage slug={slug} />
}
