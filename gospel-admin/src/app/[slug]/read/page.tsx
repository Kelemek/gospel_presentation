import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import KindleReadFooter from '@/components/KindleReadFooter'
import { createClient } from '@/lib/supabase/server'
import {
  getProfileBySlug,
  getProfileMeta,
  getPublicResourcesStructure,
} from '@/lib/supabase-data-service'
import { getEnabledTranslationOptions } from '@/lib/enabledTranslationCodes'
import { isBiblicalCounselingSecularMapProfile } from '@/lib/biblicalCounseling/biblicalCounselingReference'
import { loadSecularTermMapFromSupabase } from '@/lib/biblicalCounseling/secularTermMapDb'
import { kindleProfileReadUrl, renderKindleReadArticleHtml } from '@/lib/kindleReadHtml'
import { renderKindleReadMenuHtml } from '@/lib/kindleReadMenu'
import {
  renderKindleReadResourceSearchResultsHtml,
  runKindleReadResourceSearch,
} from '@/lib/kindleReadResourceSearch'
import { resolveKindleReadTranslationForRequest } from '@/lib/kindleReadTranslationPreference.server'
import { resolveKindleReadTextSizeForRequest } from '@/lib/kindleReadTextSizePreference.server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface KindleReadPageProps {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    translation?: string
    textSize?: string
    q?: string
    page?: string
  }>
}

export async function generateMetadata({ params }: KindleReadPageProps): Promise<Metadata> {
  const { slug } = await params
  const meta = await getProfileMeta(slug)
  if (!meta) {
    return { title: 'Profile Not Found' }
  }
  return {
    title: `${meta.title} (Kindle read)`,
    description: meta.description || `${meta.title} — read-only view for e-readers`,
  }
}

export default async function KindleReadPage({ params, searchParams }: KindleReadPageProps) {
  const { slug } = await params
  const {
    translation: translationParam,
    textSize: textSizeParam,
    q: searchQueryParam,
    page: searchPageParam,
  } = await searchParams
  const profile = await getProfileBySlug(slug)

  if (!profile) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      redirect(`/login/?redirect=/${encodeURIComponent(slug)}/read/`)
    }
    notFound()
  }

  const sections = profile.gospelData ?? []
  const translationOptions = await getEnabledTranslationOptions()
  const enabledTranslationCodes = translationOptions.map((option) => option.translation_code)
  const translation = await resolveKindleReadTranslationForRequest(
    translationParam,
    enabledTranslationCodes
  )
  const textSize = await resolveKindleReadTextSizeForRequest(textSizeParam)
  const searchQuery = searchQueryParam?.trim() ?? ''
  const searchPage = Math.max(1, Number.parseInt(searchPageParam ?? '1', 10) || 1)
  const secularTermMap = isBiblicalCounselingSecularMapProfile(slug)
    ? await loadSecularTermMapFromSupabase()
    : undefined
  const searchResult = runKindleReadResourceSearch(sections, searchQuery, searchPage, {
    profileSlug: slug,
    secularTermMap,
  })
  const searchResultsHtml =
    searchResult &&
    renderKindleReadResourceSearchResultsHtml(slug, searchResult, translation, textSize)
  const articleHtml = renderKindleReadArticleHtml(sections, slug, translation)
  const resourceItems = await getPublicResourcesStructure()
  const menuHtml = renderKindleReadMenuHtml(
    resourceItems,
    sections,
    slug,
    translationOptions,
    translation,
    textSize,
    searchQuery
  )
  const fullSiteUrl = `/${encodeURIComponent(slug)}/`

  return (
    <>
      <div className="kindle-read-toolbar">
        <header className="kindle-read-header">
          <div className="kindle-read-header-inner">
            <p className="kindle-read-site-title">The Gospel Presentation</p>
            <h1 className="kindle-read-profile-title">{profile.title}</h1>
          </div>
        </header>

        {menuHtml ? (
          <div className="kindle-read-menu-trigger-wrap">
            <div
              suppressHydrationWarning
              dangerouslySetInnerHTML={{ __html: menuHtml.triggerHtml }}
            />
          </div>
        ) : null}
      </div>

      {menuHtml ? (
        <div
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: menuHtml.panelHtml }}
        />
      ) : null}

      <main className="kindle-read-main">
        {searchResultsHtml ? (
          <div
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: searchResultsHtml }}
          />
        ) : null}
        <article
          className="kindle-read-article"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: articleHtml }}
        />

        <KindleReadFooter
          enabledTranslationCodes={enabledTranslationCodes}
          fullSiteUrl={fullSiteUrl}
          refreshHref={kindleProfileReadUrl(slug)}
        />
      </main>
    </>
  )
}
