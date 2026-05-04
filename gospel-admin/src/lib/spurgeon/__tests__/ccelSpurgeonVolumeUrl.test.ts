import {
  CCEL_SPURGEON_SERMONS_BASE,
  ccelSpurgeonVolumeUrlForCatalogNo,
} from '@/lib/spurgeon/ccelSpurgeonVolumeUrl'

describe('ccelSpurgeonVolumeUrl', () => {
  it('maps catalog numbers to the expected CCEL volume URL', () => {
    expect(ccelSpurgeonVolumeUrlForCatalogNo(1)).toBe(`${CCEL_SPURGEON_SERMONS_BASE}sermons01.xml`)
    expect(ccelSpurgeonVolumeUrlForCatalogNo(53)).toBe(`${CCEL_SPURGEON_SERMONS_BASE}sermons01.xml`)
    expect(ccelSpurgeonVolumeUrlForCatalogNo(54)).toBe(`${CCEL_SPURGEON_SERMONS_BASE}sermons02.xml`)
    expect(ccelSpurgeonVolumeUrlForCatalogNo(106)).toBe(`${CCEL_SPURGEON_SERMONS_BASE}sermons02.xml`)
    expect(ccelSpurgeonVolumeUrlForCatalogNo(422)).toBe(`${CCEL_SPURGEON_SERMONS_BASE}sermons07.xml`)
    expect(ccelSpurgeonVolumeUrlForCatalogNo(427)).toBe(`${CCEL_SPURGEON_SERMONS_BASE}sermons08.xml`)
    expect(ccelSpurgeonVolumeUrlForCatalogNo(606)).toBe(`${CCEL_SPURGEON_SERMONS_BASE}sermons10.xml`)
  })

  it('returns null for Met Tab gaps with no CCEL file and out-of-range numbers', () => {
    expect(ccelSpurgeonVolumeUrlForCatalogNo(423)).toBe(null)
    expect(ccelSpurgeonVolumeUrlForCatalogNo(426)).toBe(null)
    expect(ccelSpurgeonVolumeUrlForCatalogNo(607)).toBe(null)
    expect(ccelSpurgeonVolumeUrlForCatalogNo(0)).toBe(null)
  })
})
