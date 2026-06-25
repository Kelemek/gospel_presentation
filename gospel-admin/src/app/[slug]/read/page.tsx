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
import { kindleProfileReadUrl, renderKindleReadArticleHtml } from '@/lib/kindleReadHtml'
import { renderKindleReadMenuNavHtml } from '@/lib/kindleReadMenu'
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
  const { translation: translationParam, textSize: textSizeParam } = await searchParams
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
  const articleHtml = renderKindleReadArticleHtml(sections, slug, translation)
  const resourceItems = await getPublicResourcesStructure()
  const menuNavHtml = renderKindleReadMenuNavHtml(
    resourceItems,
    sections,
    slug,
    translationOptions,
    translation,
    textSize
  )
  const fullSiteUrl = `/${encodeURIComponent(slug)}/`

  return (
    <>
      <header className="kindle-read-header">
        <div className="kindle-read-header-inner">
          <p className="kindle-read-site-title">The Gospel Presentation</p>
          <h1 className="kindle-read-profile-title">{profile.title}</h1>
          {menuNavHtml ? (
            <div
              className="kindle-read-header-menu"
              dangerouslySetInnerHTML={{ __html: menuNavHtml }}
            />
          ) : null}
        </div>
      </header>

      <main className="kindle-read-main">
        <article
          className="kindle-read-article"
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
