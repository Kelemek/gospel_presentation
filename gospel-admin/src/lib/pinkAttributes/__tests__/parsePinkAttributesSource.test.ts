import * as fs from 'fs'
import * as path from 'path'
import {
  buildPinkAttributesChapterSubsection,
  parsePinkAttributesJson,
  parsePinkAttributesSource,
} from '@/lib/pinkAttributes/parsePinkAttributesSource'
import { PINK_ATTRIBUTES_SLUG } from '@/lib/pinkAttributes/pinkAttributesSlug'

const FIXTURE = path.join(__dirname, 'fixtures/pink-attributes-snippet.json')

describe('parsePinkAttributesSource', () => {
  it('parses preface and chapters into subsections with scripture refs', () => {
    const raw = fs.readFileSync(FIXTURE, 'utf8')
    const data = JSON.parse(raw)
    const parsed = parsePinkAttributesSource(data)

    expect(parsed.slug).toBe(PINK_ATTRIBUTES_SLUG)
    expect(parsed.gospelSection.subsections).toHaveLength(3)
    expect(parsed.gospelSection.subsections[0].title).toBe('Preface')
    expect(parsed.gospelSection.subsections[0].content).toContain('Chapel Library edition')
    expect(parsed.gospelSection.subsections[0].content).toContain('/copyright#pink-attributes-chapel')
    expect(parsed.gospelSection.subsections[1].title).toBe('Chapter 1: The Solitariness of God')
    expect(parsed.gospelSection.subsections[1].content).toContain('Exo 15:11')
    expect(parsed.gospelSection.subsections[1].nestedSubsections).toHaveLength(1)
    expect(parsed.gospelSection.subsections[1].nestedSubsections![0].title).toBe('His sovereign will')
    expect(parsed.gospelSection.subsections[1].nestedSubsections![0].content).toContain('Eph 1:11')
    expect(parsed.gospelSection.subsections[2].title).toBe('Chapter 4: The Foreknowledge of God')
    expect(parsed.gospelSection.subsections[2].nestedSubsections).toHaveLength(1)
    expect(parsed.gospelSection.subsections[2].nestedSubsections![0].title).toBe('Truth proclaimed')
    expect(parsed.gospelSection.subsections[2].nestedSubsections![0].content).toContain('Acts 2:23')
    expect(parsed.passageKeys.length).toBeGreaterThan(0)
    expect(parsed.passageKeys).toEqual(expect.arrayContaining(['EXO.15.11', 'GEN.1.1', 'EPH.1.11']))
  })

  it('buildPinkAttributesChapterSubsection keeps chapters without bold heads flat', () => {
    const sub = buildPinkAttributesChapterSubsection({
      number: 3,
      title: 'The Knowledge of God',
      paragraphs: ['Only body text here (John 4:24).'],
    })
    expect(sub.nestedSubsections).toBeUndefined()
    expect(sub.content).toContain('John 4:24')
  })

  it('finalizeGospelDataForImport normalizes inline refs', () => {
    const raw = fs.readFileSync(FIXTURE, 'utf8')
    const { finalized } = parsePinkAttributesJson(raw)
    const html = finalized.gospelData[0].subsections[1].content
    expect(html).toContain('Exodus 15:11')
    expect(html).not.toContain('(Exo 15:11)')
    const nestedHtml = finalized.gospelData[0].subsections[1].nestedSubsections![0].content
    expect(nestedHtml).toContain('Ephesians 1:11')
  })
})
