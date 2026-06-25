import type { Metadata } from 'next'
import KindleReadScriptureChapterNavLinks from '@/components/KindleReadScriptureChapterNav'
import { ScriptureFooterAttributionParagraphs } from '@/components/ScriptureFooterAttributionParagraphs'
import { getEnabledTranslationOptions } from '@/lib/enabledTranslationCodes'
import { getProfileBySlug } from '@/lib/supabase-data-service'
import {
  fetchScriptureForKindleRead,
  kindleReadScriptureBackHref,
} from '@/lib/kindleReadScripture'
import { kindleReadScriptureCardNav } from '@/lib/kindleReadScriptureCardNav'
import {
  getKindleReadTranslationFromCookies,
  resolveKindleReadTranslationForRequest,
} from '@/lib/kindleReadTranslationPreference.server'
import {
  resolveKindleReadTranslation,
  translationDisplayName,
} from '@/lib/kindleReadTranslationPreference'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface KindleScripturePageProps {
  searchParams: Promise<{
    ref?: string
    from?: string
    anchor?: string
    translation?: string
  }>
}

export async function generateMetadata({ searchParams }: KindleScripturePageProps): Promise<Metadata> {
  const { ref, translation } = await searchParams
  const label = ref?.trim() || 'Scripture'
  const translationOptions = await getEnabledTranslationOptions()
  const enabledCodes = translationOptions.map((option) => option.translation_code)
  const resolved = translation?.trim()
    ? resolveKindleReadTranslation(translation, enabledCodes)
    : await getKindleReadTranslationFromCookies(enabledCodes)
  const translationLabel = translationDisplayName(translationOptions, resolved)
  return {
    title: `${label} (${translationLabel.split(' (')[0] || resolved.toUpperCase()})`,
    description: `${translationLabel} passage: ${label}`,
  }
}

export default async function KindleScriptureReadPage({ searchParams }: KindleScripturePageProps) {
  const { ref, from, anchor, translation: translationParam } = await searchParams
  const reference = ref?.trim() ?? ''
  const backHref = kindleReadScriptureBackHref(from ?? null, anchor ?? null)
  const translationOptions = await getEnabledTranslationOptions()
  const enabledCodes = translationOptions.map((option) => option.translation_code)
  const translation = await resolveKindleReadTranslationForRequest(translationParam, enabledCodes)
  const translationLabel = translationDisplayName(translationOptions, translation)
  const result = reference ? await fetchScriptureForKindleRead(reference, translation) : null
  const navReference = result?.ok ? result.reference : reference
  const profile = from?.trim() ? await getProfileBySlug(from.trim()) : null
  const passageNav =
    navReference && profile?.gospelData?.length
      ? kindleReadScriptureCardNav(
          profile.gospelData,
          navReference,
          from,
          anchor,
          translation
        )
      : { prev: null, next: null }

  return (
    <>
      <header className="kindle-read-header">
        <div className="kindle-read-header-inner">
          <p className="kindle-read-site-title">The Gospel Presentation</p>
          <h1 className="kindle-read-profile-title">
            {result?.ok ? result.reference : reference || 'Scripture'}
          </h1>
          <p className="kindle-read-nav">
            <a href={backHref}>Back to reading</a>
          </p>
          <KindleReadScriptureChapterNavLinks nav={passageNav} />
        </div>
      </header>

      <main className="kindle-read-main">
        {!reference ? (
          <p className="kindle-read-error">No scripture reference was provided.</p>
        ) : null}

        {result && !result.ok ? <p className="kindle-read-error">{result.error}</p> : null}

        {result?.ok ? (
          <>
            <p className="kindle-read-description">{translationLabel}</p>
            <div className="kindle-read-passage">{result.text}</div>
            <div className="kindle-read-scripture-attribution">
              <ScriptureFooterAttributionParagraphs
                enabledTranslationCodes={[translation]}
                anchorClassName=""
              />
            </div>
          </>
        ) : null}

        <footer className="kindle-read-footer">
          <KindleReadScriptureChapterNavLinks nav={passageNav} />
          <p className="kindle-read-nav">
            <a href={backHref}>Back to reading</a>
          </p>
        </footer>
      </main>
    </>
  )
}
