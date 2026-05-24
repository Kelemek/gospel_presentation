export type ScriptureViewParam = 'verse' | 'chapter'

export type BuildScriptureModalShareUrlOptions = {
  origin: string
  /** Presentation profile slug (e.g. `default`, `sg00001`). */
  profileSlug: string
  reference: string
  translation?: string
  scriptureView?: ScriptureViewParam
}

function normalizeProfileSlugForShareUrl(slug: string): string {
  return slug.trim().replace(/^\/+|\/+$/g, '')
}

function normalizeReferenceForShareUrl(reference: string): string {
  return reference.trim().replace(/–/g, '-')
}

/** Deep link that opens ScriptureModal on the given gospel presentation profile. */
export function buildScriptureModalShareUrl(options: BuildScriptureModalShareUrlOptions): string {
  const { origin, profileSlug, reference, translation, scriptureView } = options
  const slug = normalizeProfileSlugForShareUrl(profileSlug)
  const ref = normalizeReferenceForShareUrl(reference)
  const baseOrigin = origin.replace(/\/$/, '')
  if (!slug) return baseOrigin
  if (!ref) return `${baseOrigin}/${slug}`

  const base = `${baseOrigin}/${slug}`
  const params = new URLSearchParams()
  params.set('scriptureRef', ref)
  const trans = translation?.trim().toLowerCase()
  if (trans) params.set('translation', trans)
  if (scriptureView === 'chapter') params.set('scriptureView', 'chapter')
  return `${base}?${params.toString()}`
}

const SHARE_LINK_INTRO = 'Open in The Gospel Presentation:'

/** Appends the deep-link line to formatted passage text for clipboard / share body. */
export function appendScriptureShareLink(formattedPassage: string, pageUrl: string): string {
  const url = pageUrl.trim()
  if (!url) return formattedPassage
  if (!formattedPassage.trim()) return `${SHARE_LINK_INTRO}\n${url}`
  return `${formattedPassage}\n\n${SHARE_LINK_INTRO}\n${url}`
}
