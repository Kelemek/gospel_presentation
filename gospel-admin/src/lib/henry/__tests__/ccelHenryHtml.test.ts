import { readFileSync } from 'fs'
import path from 'path'
import { getHenryVolume } from '@/lib/henry/henryCcelManifest'
import { normalizeGospelPresentationData } from '@/lib/scriptureReferenceNormalize'
import { segmentPlainTextForGospelInlines } from '@/lib/injectGospelInlineMarkersInHtml'
import {
  chapterPassageDisplayFromSubsectionTitle,
  henrySubsectionTitleForUnit,
  normalizeHenryChapterTitle,
  parseCcelHenryVolume,
  romanNumeralToArabic,
} from '@/lib/henry/ccelHenryHtml'

const FIXTURE = readFileSync(
  path.join(__dirname, 'fixtures', 'mhc1-genesis-ch1-snippet.xml'),
  'utf8'
)

const FIRST_SAMUEL_FIXTURE = readFileSync(
  path.join(__dirname, 'fixtures', 'mhc2-first-samuel-ch1-snippet.xml'),
  'utf8'
)

const PSALM_FIXTURE = readFileSync(
  path.join(__dirname, 'fixtures', 'mhc3-psalm51-snippet.xml'),
  'utf8'
)

const ROMANS_FIXTURE = readFileSync(
  path.join(__dirname, 'fixtures', 'mhc4-romans-ch8-snippet.xml'),
  'utf8'
)

const GEN_VER_ONLY_FIXTURE = readFileSync(
  path.join(__dirname, 'fixtures', 'mhc1-genesis-ver-only-snippet.xml'),
  'utf8'
)

describe('romanNumeralToArabic', () => {
  it('converts standard Roman numerals including Psalms 51+', () => {
    expect(romanNumeralToArabic('I')).toBe(1)
    expect(romanNumeralToArabic('XII')).toBe(12)
    expect(romanNumeralToArabic('XLVIII')).toBe(48)
    expect(romanNumeralToArabic('L')).toBe(50)
    expect(romanNumeralToArabic('LI')).toBe(51)
    expect(romanNumeralToArabic('LII')).toBe(52)
    expect(romanNumeralToArabic('C')).toBe(100)
    expect(romanNumeralToArabic('CL')).toBe(150)
    expect(romanNumeralToArabic('3')).toBe(3)
  })
})

describe('normalizeHenryChapterTitle', () => {
  it('converts Roman chapter numerals', () => {
    expect(normalizeHenryChapterTitle('Chapter I')).toBe('Chapter 1')
    expect(normalizeHenryChapterTitle('Chapter XII')).toBe('Chapter 12')
    expect(normalizeHenryChapterTitle('Chapter 3')).toBe('Chapter 3')
    expect(normalizeHenryChapterTitle('Chapter LI')).toBe('Chapter 51')
    expect(normalizeHenryChapterTitle('Chapter CL')).toBe('Chapter 150')
  })
})

describe('parseCcelHenryVolume', () => {
  it('parses Genesis chapter div2 units from mhc1 fixture', () => {
    const vol = getHenryVolume('mhc1')!
    const chunks = parseCcelHenryVolume(FIXTURE, vol)
    const gen = chunks.find((c) => c.bookUsfm === 'GEN')
    expect(gen).toBeDefined()
    expect(gen!.subsections).toHaveLength(1)
    expect(gen!.subsections[0].title).toBe('Genesis — Chapter 1')
    expect(gen!.subsections[0].content).toContain('first verse')
    expect(gen!.passageKeys.some((k) => k.startsWith('GEN.1'))).toBe(true)
  })

  it('uses Psalm N titles for Psalms instead of Chapter N', () => {
    expect(henrySubsectionTitleForUnit('PSA', 'Chapter I')).toBe('Psalm 1')
    expect(henrySubsectionTitleForUnit('PSA', 'Chapter LI')).toBe('Psalm 51')
    const vol = getHenryVolume('mhc3')!
    const chunks = parseCcelHenryVolume(PSALM_FIXTURE, vol)
    const psa = chunks.find((c) => c.bookUsfm === 'PSA')
    expect(psa!.subsections[0].title).toBe('Psalm 51')
  })

  it('parses First Samuel div1 title from mhc2-style CCEL naming', () => {
    const vol = getHenryVolume('mhc2')!
    const chunks = parseCcelHenryVolume(FIRST_SAMUEL_FIXTURE, vol)
    const sa = chunks.find((c) => c.bookUsfm === '1SA')
    expect(sa).toBeDefined()
    expect(sa!.subsections[0].title).toBe('1 Samuel — Chapter 1')
    expect(sa!.passageKeys.some((k) => k.startsWith('1SA.1'))).toBe(true)
  })

  it('indexes Roman numeral passage attrs and chapter key for Romans 8', () => {
    const vol = getHenryVolume('mhc6')!
    const chunks = parseCcelHenryVolume(ROMANS_FIXTURE, vol)
    const rom = chunks.find((c) => c.bookUsfm === 'ROM')
    expect(rom).toBeDefined()
    expect(rom!.subsections[0].title).toBe('Romans — Chapter 8')
    expect(rom!.passageKeys).toContain('ROM.8')
    expect(rom!.passageKeys.some((k) => k === 'ROM.8.28' || k.startsWith('ROM.8.28'))).toBe(true)
  })

  it('adds chapter-level passage key for Psalm 51 from subsection title', () => {
    const vol = getHenryVolume('mhc3')!
    const chunks = parseCcelHenryVolume(PSALM_FIXTURE, vol)
    const psa = chunks.find((c) => c.bookUsfm === 'PSA')!
    expect(psa.passageKeys).toContain('PSA.51')
    expect(chapterPassageDisplayFromSubsectionTitle('Psalm 51')).toBe('Psalms 51')
  })

  it('expands scripRef inner text to recognizable scripture in stored HTML', () => {
    const vol = getHenryVolume('mhc1')!
    const chunks = parseCcelHenryVolume(FIXTURE, vol)
    const gen = chunks.find((c) => c.bookUsfm === 'GEN')!
    const { data } = normalizeGospelPresentationData([
      { section: 'mhgen', title: 'T', subsections: gen.subsections },
    ])
    const plain = data[0].subsections![0].content.replace(/<[^>]+>/g, ' ')
    const refs = segmentPlainTextForGospelInlines(plain)
      .filter((s) => s.kind === 'scripture')
      .map((s) => s.cleanRef)
    expect(refs.some((r) => r.includes('Genesis') && r.includes('1'))).toBe(true)
  })

  it('includes chapter key when scripRef lacks osisRef but passage attr is present', () => {
    const vol = getHenryVolume('mhc1')!
    const chunks = parseCcelHenryVolume(GEN_VER_ONLY_FIXTURE, vol)
    const gen = chunks.find((c) => c.bookUsfm === 'GEN')!
    expect(gen.passageKeys).toContain('GEN.1')
    expect(gen.passageKeys.some((k) => k.startsWith('GEN.1.3'))).toBe(true)
  })

  it('skips preface and title page div1 blocks', () => {
    const vol = getHenryVolume('mhc1')!
    const xml = `
<div1 title="Title Page" id="i"><p>Cover</p></div1>
<div1 title="Preface: Genesis to Deuteronomy" id="ii"><p>Preface text</p></div1>
${FIXTURE}
`
    const chunks = parseCcelHenryVolume(xml, vol)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].bookUsfm).toBe('GEN')
  })
})
