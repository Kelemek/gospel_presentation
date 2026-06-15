import { readFileSync } from 'fs'
import path from 'path'
import {
  inventoryHodgeThml,
  parseCcelHodgeVolumeXml,
  sectionIdFromDiv1Title,
  shouldSkipHodgeDiv2Title,
} from '@/lib/hodge/ccelHodgeHtml'
import { hodgeVolumeById } from '@/lib/hodge/hodgeCcelManifest'
import { HODGE_ST_VOLUME_1_SLUG } from '@/lib/hodge/hodgeSlug'
import { finalizeGospelDataForImport } from '@/lib/finalizeGospelDataForImport'

const FIXTURE = readFileSync(
  path.join(__dirname, 'fixtures', 'hodge-vol1-snippet.xml'),
  'utf8'
)

const VOL1 = hodgeVolumeById(1)

describe('sectionIdFromDiv1Title', () => {
  it('maps Introduction and Roman Part titles', () => {
    expect(sectionIdFromDiv1Title('Introduction')).toBe('intro')
    expect(sectionIdFromDiv1Title('Part I. Theology Proper.')).toBe('i')
    expect(sectionIdFromDiv1Title('Part III. Continued.')).toBe('iii-continued')
    expect(sectionIdFromDiv1Title('Part IV. Eschatology.')).toBe('iv')
  })
})

describe('shouldSkipHodgeDiv2Title', () => {
  it('skips CCEL index div2 blocks', () => {
    expect(shouldSkipHodgeDiv2Title('Index of Scripture References')).toBe(true)
    expect(shouldSkipHodgeDiv2Title('Chapter I. On Method.')).toBe(false)
  })
})

describe('inventoryHodgeThml', () => {
  it('counts content sections and subsections', () => {
    const inv = inventoryHodgeThml(FIXTURE)
    expect(inv.sections).toHaveLength(2)
    expect(inv.sections[0]).toMatchObject({
      title: 'Introduction',
      subsectionCount: 1,
    })
    expect(inv.sections[1]).toMatchObject({
      title: 'Part I. Theology Proper.',
      subsectionCount: 1,
    })
  })
})

describe('parseCcelHodgeVolumeXml', () => {
  it('parses sections with scripture cards and normalized inline refs', () => {
    const parsed = parseCcelHodgeVolumeXml(FIXTURE, VOL1)
    expect(parsed.slug).toBe(HODGE_ST_VOLUME_1_SLUG)
    expect(parsed.gospelData).toHaveLength(2)
    expect(parsed.gospelData[0].section).toBe('intro')
    expect(parsed.gospelData[0].subsections[0].title).toBe(
      'Chapter I. On Method. — 1. Theology a Science.'
    )
    expect(parsed.gospelData[0].subsections[0].content).toContain('Hebrews 11:6')
    expect(parsed.gospelData[1].subsections[0].content).toContain('John 1:14')
    expect(parsed.gospelData[1].subsections).toHaveLength(1)
    expect(parsed.passageKeys.some((k) => k.startsWith('HEB.11'))).toBe(true)
    expect(parsed.passageKeys.some((k) => k.startsWith('JHN.1'))).toBe(true)
  })

  it('finalize normalizes card references', () => {
    const parsed = parseCcelHodgeVolumeXml(FIXTURE, VOL1)
    const { gospelData } = finalizeGospelDataForImport(parsed.gospelData, {
      additionalPassageKeys: parsed.passageKeys,
    })
    const cards = gospelData[0].subsections[0].scriptureReferences ?? []
    expect(cards.some((c) => c.reference === 'Hebrews 11:6')).toBe(true)
  })
})
