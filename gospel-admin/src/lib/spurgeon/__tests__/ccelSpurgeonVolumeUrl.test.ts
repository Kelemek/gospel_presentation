import {
  CCEL_SPURGEON_SERMONS_BASE,
  SPURGEON_MET_TAB_CCEL_CATALOG_GAPS,
  SPURGEON_MET_TAB_SEQUENCE_HOLES,
  ccelSpurgeonMetTabVolumeUrls,
  ccelSpurgeonVolumeUrlForCatalogNo,
  spurgeonMetTabCcelMaxCatalogNumber,
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
    expect(ccelSpurgeonVolumeUrlForCatalogNo(607)).toBe(`${CCEL_SPURGEON_SERMONS_BASE}sermons11.xml`)
    expect(ccelSpurgeonVolumeUrlForCatalogNo(3563)).toBe(`${CCEL_SPURGEON_SERMONS_BASE}sermons63.xml`)
  })

  it('maps duplicate CCEL boundary sermons (1331, 2237) only to the earlier volume', () => {
    expect(ccelSpurgeonVolumeUrlForCatalogNo(1331)).toBe(`${CCEL_SPURGEON_SERMONS_BASE}sermons22.xml`)
    expect(ccelSpurgeonVolumeUrlForCatalogNo(1332)).toBe(`${CCEL_SPURGEON_SERMONS_BASE}sermons23.xml`)
    expect(ccelSpurgeonVolumeUrlForCatalogNo(2237)).toBe(`${CCEL_SPURGEON_SERMONS_BASE}sermons37.xml`)
    expect(ccelSpurgeonVolumeUrlForCatalogNo(2238)).toBe(`${CCEL_SPURGEON_SERMONS_BASE}sermons38.xml`)
  })

  it('returns null for Met Tab gaps, sequence holes, and out-of-range numbers', () => {
    expect(ccelSpurgeonVolumeUrlForCatalogNo(423)).toBe(null)
    expect(ccelSpurgeonVolumeUrlForCatalogNo(426)).toBe(null)
    expect(ccelSpurgeonVolumeUrlForCatalogNo(1451)).toBe(null)
    expect(ccelSpurgeonVolumeUrlForCatalogNo(2000)).toBe(null)
    expect(ccelSpurgeonVolumeUrlForCatalogNo(3564)).toBe(null)
    expect(ccelSpurgeonVolumeUrlForCatalogNo(0)).toBe(null)
  })

  it('exposes Met Tab source gaps, sequence holes, and max catalog for import tooling', () => {
    expect(SPURGEON_MET_TAB_CCEL_CATALOG_GAPS).toEqual([423, 424, 425, 426])
    expect(SPURGEON_MET_TAB_SEQUENCE_HOLES).toEqual([1451, 1452, 1876, 2000])
    expect(spurgeonMetTabCcelMaxCatalogNumber()).toBe(3563)
  })

  it('ccelSpurgeonMetTabVolumeUrls lists sermons01 through sermons63', () => {
    const urls = ccelSpurgeonMetTabVolumeUrls()
    expect(urls).toHaveLength(63)
    expect(urls[0]).toBe(`${CCEL_SPURGEON_SERMONS_BASE}sermons01.xml`)
    expect(urls[9]).toBe(`${CCEL_SPURGEON_SERMONS_BASE}sermons10.xml`)
    expect(urls[62]).toBe(`${CCEL_SPURGEON_SERMONS_BASE}sermons63.xml`)
  })
})
