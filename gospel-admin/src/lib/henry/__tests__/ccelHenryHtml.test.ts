import { readFileSync } from 'fs'
import path from 'path'
import { getHenryVolume } from '@/lib/henry/henryCcelManifest'
import {
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
