import type { WatsonBookSlug } from '@/lib/watson/watsonSlug'
import {
  WATSON_BEATITUDES_SLUG,
  WATSON_COMMANDMENTS_SLUG,
  WATSON_CONTENTMENT_SLUG,
  WATSON_CORDIAL_SLUG,
  WATSON_DIVINITY_SLUG,
  WATSON_LORDS_PRAYER_SLUG,
  watsonBeatitudesProfileTitle,
  watsonCommandmentsProfileTitle,
  watsonContentmentProfileTitle,
  watsonCordialProfileTitle,
  watsonDivinityProfileTitle,
  watsonLordsPrayerProfileTitle,
} from '@/lib/watson/watsonSlug'

export type WatsonCcelBookId =
  | 'contentment'
  | 'beatitudes'
  | 'divinity'
  | 'cordial'
  | 'prayer'
  | 'commandments'

export type WatsonSubsectionLevel = 'div1' | 'div2'

export type WatsonCcelBookDef = {
  id: WatsonCcelBookId
  slug: WatsonBookSlug
  profileTitle: string
  xmlUrl: string
  sourceHref: string
  subsectionLevel: WatsonSubsectionLevel
  shouldSkipDiv1Title: (title: string) => boolean
}

export function defaultSkipWatsonDiv1Title(title: string): boolean {
  const t = title.trim()
  if (/^title page$/i.test(t)) return true
  if (/^indexes$/i.test(t)) return true
  if (/^contents$/i.test(t)) return true
  if (/^original table of contents$/i.test(t)) return true
  if (/^to the reader$/i.test(t)) return true
  if (/^forward$/i.test(t)) return true
  return false
}

function skipDivinityDiv1Title(title: string): boolean {
  const t = title.trim()
  if (defaultSkipWatsonDiv1Title(t)) return true
  if (/^a body of divinity$/i.test(t)) return true
  if (/^brief memoir of thomas watson$/i.test(t)) return true
  return false
}

/** CCEL Watson corpus — keep in sync with docs and copyright attributions. */
export const WATSON_CCEL_BOOKS: readonly WatsonCcelBookDef[] = [
  {
    id: 'contentment',
    slug: WATSON_CONTENTMENT_SLUG,
    profileTitle: watsonContentmentProfileTitle(),
    xmlUrl: 'https://www.ccel.org/ccel/w/watson/contentment.xml',
    sourceHref: 'https://www.ccel.org/ccel/watson/contentment.html',
    subsectionLevel: 'div1',
    shouldSkipDiv1Title: defaultSkipWatsonDiv1Title,
  },
  {
    id: 'beatitudes',
    slug: WATSON_BEATITUDES_SLUG,
    profileTitle: watsonBeatitudesProfileTitle(),
    xmlUrl: 'https://www.ccel.org/ccel/w/watson/beatitudes.xml',
    sourceHref: 'https://www.ccel.org/ccel/watson/beatitudes.html',
    subsectionLevel: 'div1',
    shouldSkipDiv1Title: defaultSkipWatsonDiv1Title,
  },
  {
    id: 'divinity',
    slug: WATSON_DIVINITY_SLUG,
    profileTitle: watsonDivinityProfileTitle(),
    xmlUrl: 'https://www.ccel.org/ccel/w/watson/divinity.xml',
    sourceHref: 'https://www.ccel.org/ccel/watson/divinity.html',
    subsectionLevel: 'div2',
    shouldSkipDiv1Title: skipDivinityDiv1Title,
  },
  {
    id: 'cordial',
    slug: WATSON_CORDIAL_SLUG,
    profileTitle: watsonCordialProfileTitle(),
    xmlUrl: 'https://www.ccel.org/ccel/w/watson/cordial.xml',
    sourceHref: 'https://www.ccel.org/ccel/watson/cordial.html',
    subsectionLevel: 'div1',
    shouldSkipDiv1Title: (title) => {
      const t = title.trim()
      if (/^title page$/i.test(t)) return true
      if (/^indexes$/i.test(t)) return true
      return false
    },
  },
  {
    id: 'prayer',
    slug: WATSON_LORDS_PRAYER_SLUG,
    profileTitle: watsonLordsPrayerProfileTitle(),
    xmlUrl: 'https://www.ccel.org/ccel/w/watson/prayer.xml',
    sourceHref: 'https://www.ccel.org/ccel/watson/prayer.html',
    subsectionLevel: 'div1',
    shouldSkipDiv1Title: defaultSkipWatsonDiv1Title,
  },
  {
    id: 'commandments',
    slug: WATSON_COMMANDMENTS_SLUG,
    profileTitle: watsonCommandmentsProfileTitle(),
    xmlUrl: 'https://www.ccel.org/ccel/w/watson/commandments.xml',
    sourceHref: 'https://www.ccel.org/ccel/watson/commandments.html',
    subsectionLevel: 'div2',
    shouldSkipDiv1Title: defaultSkipWatsonDiv1Title,
  },
]

export function watsonBookById(id: WatsonCcelBookId): WatsonCcelBookDef {
  const book = WATSON_CCEL_BOOKS.find((b) => b.id === id)
  if (!book) throw new Error(`Unknown Watson book id: ${id}`)
  return book
}

export function watsonBookBySlug(slug: string): WatsonCcelBookDef | undefined {
  const s = slug.trim().toLowerCase()
  return WATSON_CCEL_BOOKS.find((b) => b.slug === s)
}

export function allWatsonCcelBookIds(): WatsonCcelBookId[] {
  return WATSON_CCEL_BOOKS.map((b) => b.id)
}
