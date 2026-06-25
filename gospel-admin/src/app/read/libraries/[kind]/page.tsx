import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import KindleReadFooter from '@/components/KindleReadFooter'
import {
  fetchKindleReadLibraryPage,
  isKindleReadLibraryKind,
  kindleReadLibraryIndexUrl,
  kindleReadLibraryTitle,
} from '@/lib/kindleReadLibraryData'
import { getEnabledTranslationCodes } from '@/lib/enabledTranslationCodes'
import { kindleProfileReadUrl } from '@/lib/kindleReadHtml'
import { renderKindleReadLibraryListHtml } from '@/lib/kindleReadResources'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface KindleLibraryPageProps {
  params: Promise<{ kind: string }>
  searchParams: Promise<{ page?: string; from?: string; q?: string }>
}

export async function generateMetadata({ params }: KindleLibraryPageProps): Promise<Metadata> {
  const { kind } = await params
  if (!isKindleReadLibraryKind(kind)) {
    return { title: 'Library not found' }
  }
  return {
    title: `${kindleReadLibraryTitle(kind)} (Kindle read)`,
  }
}

export default async function KindleLibraryIndexPage({ params, searchParams }: KindleLibraryPageProps) {
  const { kind: kindParam } = await params
  if (!isKindleReadLibraryKind(kindParam)) {
    notFound()
  }

  const { page: pageParam, from, q } = await searchParams
  const page = Math.max(1, Number.parseInt(pageParam || '1', 10) || 1)
  const fromSlug = from?.trim() || undefined
  const searchQuery = q?.trim() || undefined
  const libraryPage = await fetchKindleReadLibraryPage(kindParam, page, undefined, searchQuery)
  const backHref = fromSlug ? kindleProfileReadUrl(fromSlug) : kindleProfileReadUrl('default')
  const html = renderKindleReadLibraryListHtml(libraryPage, backHref, fromSlug)
  const enabledTranslationCodes = await getEnabledTranslationCodes()
  const fullSiteUrl = fromSlug ? `/${encodeURIComponent(fromSlug)}/` : '/default/'
  const refreshHref = kindleReadLibraryIndexUrl(kindParam, page, fromSlug, searchQuery)

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <main className="kindle-read-main">
        <KindleReadFooter
          enabledTranslationCodes={enabledTranslationCodes}
          fullSiteUrl={fullSiteUrl}
          refreshHref={refreshHref}
        />
      </main>
    </>
  )
}
