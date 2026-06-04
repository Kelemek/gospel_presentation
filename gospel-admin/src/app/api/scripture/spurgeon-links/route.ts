import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { canonicalScriptureCacheReference } from '@/lib/api-bible-passage-id'
import { logger } from '@/lib/logger'
import { isCalvinCommentaryProfileSlug, sortCalvinBooksByCanonOrder } from '@/lib/calvin/calvinSlug'
import { isHenryCommentaryProfileSlug, sortHenryBooksByCanonOrder } from '@/lib/henry/henrySlug'
import { sortMorneveRowsByCalendar } from '@/lib/spurgeon/morneveSlug'
import { isMorneveProfileSlug } from '@/lib/spurgeon/morneveSlug'
import { sortEdwardsSermonsByDisplayTitleAZ } from '@/lib/edwards/edwardsSlug'
import { isEdwardsSermonProfileSlug } from '@/lib/edwards/edwardsSlug'
import { sortSpurgeonSermonsByDisplayTitleAZ } from '@/lib/spurgeon/sortBySpurgeonSermonSlug'
import { isSpurgeonSermonProfileSlug } from '@/lib/spurgeon/sortBySpurgeonSermonSlug'
import { sortIndexedBooksByTitleAZ } from '@/lib/study/sortIndexedBooksByTitle'
import { isStudyLibraryCorpusProfileSlug } from '@/lib/study/studyLibraryCorpusSlug'
import { profileIdsFromPassageIndexLookup } from '@/lib/spurgeon/spurgeonPassageIndexLookup'

const MAX_ITEMS = 8

type StudyLinkKind = 'sermon' | 'edwards' | 'morneve' | 'calvin' | 'henry' | 'book'

/**
 * GET /api/scripture/spurgeon-links?reference=...
 * Indexed Spurgeon sermons, Edwards sermons, Morning & Evening, Calvin, Matthew Henry, and book templates
 * for scripture modal Study (max 8 combined preview items).
 * Item order: Spurgeon, Edwards, morneve, Calvin, Henry, then books (A–Z).
 */
export async function GET(request: NextRequest) {
  try {
    const ref = (new URL(request.url).searchParams.get('reference') || '').trim()
    if (!ref) {
      return NextResponse.json({ error: 'reference is required' }, { status: 400 })
    }

    const passageKey = canonicalScriptureCacheReference(ref)
    if (!passageKey) {
      return NextResponse.json(emptyStudyLinksResponse())
    }

    const admin = createAdminClient()
    const idsAll = await profileIdsFromPassageIndexLookup(admin, ref)
    if (idsAll.length === 0) {
      return NextResponse.json(emptyStudyLinksResponse())
    }

    const { data: profileRows, error: profErr } = await admin
      .from('profiles')
      .select('slug,title')
      .in('id', idsAll)
      .eq('is_public', true)
      .eq('is_template', true)

    if (profErr) throw profErr

    const profiles = (profileRows || []) as { slug: string; title: string }[]
    const sermonProfiles = profiles.filter((p) => isSpurgeonSermonProfileSlug(p.slug))
    const edwardsProfiles = profiles.filter((p) => isEdwardsSermonProfileSlug(p.slug))
    const morneveProfiles = profiles.filter((p) => isMorneveProfileSlug(p.slug))
    const calvinProfiles = profiles.filter((p) => isCalvinCommentaryProfileSlug(p.slug))
    const henryProfiles = profiles.filter((p) => isHenryCommentaryProfileSlug(p.slug))

    const sermonSorted = sortSpurgeonSermonsByDisplayTitleAZ(sermonProfiles)
    const edwardsSorted = sortEdwardsSermonsByDisplayTitleAZ(edwardsProfiles)
    const morneveSorted = sortMorneveRowsByCalendar(morneveProfiles)
    const calvinSorted = sortCalvinBooksByCanonOrder(calvinProfiles)
    const henrySorted = sortHenryBooksByCanonOrder(henryProfiles)
    const bookSorted = sortIndexedBooksByTitleAZ(
      profiles.filter((p) => !isStudyLibraryCorpusProfileSlug(p.slug))
    )

    const items: { slug: string; title: string; kind: StudyLinkKind }[] = []
    for (const p of sermonSorted) {
      if (items.length >= MAX_ITEMS) break
      items.push({ slug: p.slug, title: p.title || p.slug, kind: 'sermon' })
    }
    for (const p of edwardsSorted) {
      if (items.length >= MAX_ITEMS) break
      items.push({ slug: p.slug, title: p.title || p.slug, kind: 'edwards' })
    }
    for (const p of morneveSorted) {
      if (items.length >= MAX_ITEMS) break
      items.push({ slug: p.slug, title: p.title || p.slug, kind: 'morneve' })
    }
    for (const p of calvinSorted) {
      if (items.length >= MAX_ITEMS) break
      items.push({ slug: p.slug, title: p.title || p.slug, kind: 'calvin' })
    }
    for (const p of henrySorted) {
      if (items.length >= MAX_ITEMS) break
      items.push({ slug: p.slug, title: p.title || p.slug, kind: 'henry' })
    }
    for (const p of bookSorted) {
      if (items.length >= MAX_ITEMS) break
      items.push({ slug: p.slug, title: p.title || p.slug, kind: 'book' })
    }

    return NextResponse.json({
      items,
      sermonCount: sermonSorted.length,
      edwardsCount: edwardsSorted.length,
      morneveCount: morneveSorted.length,
      calvinCount: calvinSorted.length,
      henryCount: henrySorted.length,
      bookCount: bookSorted.length,
    })
  } catch (e) {
    logger.error('[API] GET /api/scripture/spurgeon-links', e)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}

function emptyStudyLinksResponse() {
  return {
    items: [],
    sermonCount: 0,
    edwardsCount: 0,
    morneveCount: 0,
    calvinCount: 0,
    henryCount: 0,
    bookCount: 0,
  }
}
