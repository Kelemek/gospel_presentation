import { readFileSync } from 'fs'
import path from 'path'
import {
  inventoryBerkhofThml,
  parseCcelBerkhofXml,
  partNumberFromDiv1Title,
} from '@/lib/berkhof/ccelBerkhofHtml'
import { BERKHOF_ST_SLUG } from '@/lib/berkhof/berkhofSlug'
import { finalizeGospelDataForImport } from '@/lib/finalizeGospelDataForImport'

const FIXTURE = readFileSync(
  path.join(__dirname, 'fixtures', 'berkhof-part1-snippet.xml'),
  'utf8'
)

describe('partNumberFromDiv1Title', () => {
  it('maps Part One through Part Six', () => {
    expect(partNumberFromDiv1Title('Part One: The Doctrine of God')).toBe(1)
    expect(partNumberFromDiv1Title('Part Six: The Doctrine of the Last Things')).toBe(6)
  })
})

describe('inventoryBerkhofThml', () => {
  it('counts div2 and div3 under each Part', () => {
    const inv = inventoryBerkhofThml(FIXTURE)
    expect(inv.partDiv1s).toHaveLength(6)
    expect(inv.partDiv1s[0]).toMatchObject({
      title: 'Part One: The Doctrine of God',
      div2Count: 1,
      div3Count: 1,
      subsectionCount: 1,
    })
  })
})

describe('parseCcelBerkhofXml', () => {
  it('parses six sections with scripture cards and normalized inline refs', () => {
    const parsed = parseCcelBerkhofXml(FIXTURE)
    expect(parsed.slug).toBe(BERKHOF_ST_SLUG)
    expect(parsed.gospelData).toHaveLength(6)
    expect(parsed.gospelData[0].title).toBe('Part One: The Doctrine of God')
    expect(parsed.gospelData[0].subsections).toHaveLength(1)
    const sub = parsed.gospelData[0].subsections[0]
    expect(sub.title).toBe('The Being of God — I. The Existence of God')
    expect(sub.scriptureReferences?.length).toBeGreaterThan(0)
    expect(sub.content).toContain('Hebrews 11:6')
    expect(sub.content).toContain('Romans 8:28')
    expect(sub.content).toContain('<strong>1.</strong> ABSOLUTE DENIAL')
    expect(sub.content).toContain('<strong>a.</strong>')
    expect(sub.content).toContain('<strong>1.</strong> THE ONTOLOGICAL')
    expect(sub.content).not.toMatch(/\bRom 8:28\b/)
    expect(parsed.passageKeys.some((k) => k.startsWith('HEB.11'))).toBe(true)
    expect(parsed.passageKeys.some((k) => k.startsWith('ROM.8'))).toBe(true)
  })

  it('throws when a Part has no div2 and no substantive inner content', () => {
    const xml = FIXTURE.replace(
      /    <div1 id="iii" title="Part One: The Doctrine of God">[\s\S]*?    <\/div1>/,
      `    <div1 id="iii" title="Part One: The Doctrine of God">
<h2>PART ONE</h2>
    </div1>`
    )
    expect(() => parseCcelBerkhofXml(xml)).toThrow(/No Berkhof subsections found in Part div1/)
  })

  it('finalize normalizes card references', () => {
    const parsed = parseCcelBerkhofXml(FIXTURE)
    const { gospelData } = finalizeGospelDataForImport(parsed.gospelData, {
      additionalPassageKeys: parsed.passageKeys,
    })
    const cards = gospelData[0].subsections[0].scriptureReferences ?? []
    expect(cards.some((c) => c.reference === 'Hebrews 11:6')).toBe(true)
    expect(cards.some((c) => c.reference === 'Romans 8:28')).toBe(true)
  })
})
