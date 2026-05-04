/** Default CCEL ThML base for Spurgeon’s *New Park Street* / *Metropolitan Tabernacle* volumes. */
export const CCEL_SPURGEON_SERMONS_BASE = 'https://www.ccel.org/ccel/spurgeon/'

/**
 * Inclusive catalog ranges per `sermons01.xml` … `sermons63.xml` on CCEL (aligned with dominant
 * `Sermon N.` / `(No. N)` clusters in each file; a few CCEL titles have typos that would parse as
 * wrong N—see gap importer / targeted `--slug` re-import).
 *
 * **Sequence holes** (no sermon published / not in XML): **423–426**, **1451–1452**, **1876**,
 * **2000**. Those numbers return `null` from {@link ccelSpurgeonVolumeUrlForCatalogNo}.
 *
 * **423–426** also have no `div1` anywhere on CCEL for this series (same as unmapped).
 */
export const SPURGEON_MET_TAB_CCEL_CATALOG_GAPS: readonly number[] = [423, 424, 425, 426]

/** Other catalog numbers with no CCEL volume range (numbering skips in the published Met Tab). */
export const SPURGEON_MET_TAB_SEQUENCE_HOLES: readonly number[] = [1451, 1452, 1876, 2000]

const SPURGEON_CCEL_VOLUME_FILES: { catalogLo: number; catalogHi: number; file: string }[] = [
  { catalogLo: 1, catalogHi: 53, file: 'sermons01.xml' },
  { catalogLo: 54, catalogHi: 106, file: 'sermons02.xml' },
  { catalogLo: 107, catalogHi: 164, file: 'sermons03.xml' },
  { catalogLo: 165, catalogHi: 224, file: 'sermons04.xml' },
  { catalogLo: 225, catalogHi: 285, file: 'sermons05.xml' },
  { catalogLo: 286, catalogHi: 347, file: 'sermons06.xml' },
  { catalogLo: 348, catalogHi: 422, file: 'sermons07.xml' },
  { catalogLo: 427, catalogHi: 486, file: 'sermons08.xml' },
  { catalogLo: 487, catalogHi: 546, file: 'sermons09.xml' },
  { catalogLo: 547, catalogHi: 606, file: 'sermons10.xml' },
  { catalogLo: 607, catalogHi: 667, file: 'sermons11.xml' },
  { catalogLo: 668, catalogHi: 727, file: 'sermons12.xml' },
  { catalogLo: 728, catalogHi: 787, file: 'sermons13.xml' },
  { catalogLo: 788, catalogHi: 847, file: 'sermons14.xml' },
  { catalogLo: 848, catalogHi: 907, file: 'sermons15.xml' },
  { catalogLo: 908, catalogHi: 967, file: 'sermons16.xml' },
  { catalogLo: 968, catalogHi: 1027, file: 'sermons17.xml' },
  { catalogLo: 1028, catalogHi: 1088, file: 'sermons18.xml' },
  { catalogLo: 1089, catalogHi: 1149, file: 'sermons19.xml' },
  { catalogLo: 1150, catalogHi: 1209, file: 'sermons20.xml' },
  { catalogLo: 1210, catalogHi: 1270, file: 'sermons21.xml' },
  { catalogLo: 1271, catalogHi: 1331, file: 'sermons22.xml' },
  { catalogLo: 1331, catalogHi: 1390, file: 'sermons23.xml' },
  { catalogLo: 1391, catalogHi: 1450, file: 'sermons24.xml' },
  { catalogLo: 1453, catalogHi: 1510, file: 'sermons25.xml' },
  { catalogLo: 1511, catalogHi: 1574, file: 'sermons26.xml' },
  { catalogLo: 1575, catalogHi: 1636, file: 'sermons27.xml' },
  { catalogLo: 1637, catalogHi: 1697, file: 'sermons28.xml' },
  { catalogLo: 1698, catalogHi: 1756, file: 'sermons29.xml' },
  { catalogLo: 1757, catalogHi: 1815, file: 'sermons30.xml' },
  { catalogLo: 1816, catalogHi: 1875, file: 'sermons31.xml' },
  { catalogLo: 1877, catalogHi: 1937, file: 'sermons32.xml' },
  { catalogLo: 1938, catalogHi: 1999, file: 'sermons33.xml' },
  { catalogLo: 2001, catalogHi: 2061, file: 'sermons34.xml' },
  { catalogLo: 2062, catalogHi: 2120, file: 'sermons35.xml' },
  { catalogLo: 2121, catalogHi: 2181, file: 'sermons36.xml' },
  { catalogLo: 2182, catalogHi: 2237, file: 'sermons37.xml' },
  { catalogLo: 2237, catalogHi: 2288, file: 'sermons38.xml' },
  { catalogLo: 2289, catalogHi: 2341, file: 'sermons39.xml' },
  { catalogLo: 2342, catalogHi: 2393, file: 'sermons40.xml' },
  { catalogLo: 2394, catalogHi: 2445, file: 'sermons41.xml' },
  { catalogLo: 2446, catalogHi: 2497, file: 'sermons42.xml' },
  { catalogLo: 2498, catalogHi: 2549, file: 'sermons43.xml' },
  { catalogLo: 2550, catalogHi: 2602, file: 'sermons44.xml' },
  { catalogLo: 2603, catalogHi: 2655, file: 'sermons45.xml' },
  { catalogLo: 2656, catalogHi: 2707, file: 'sermons46.xml' },
  { catalogLo: 2708, catalogHi: 2759, file: 'sermons47.xml' },
  { catalogLo: 2760, catalogHi: 2811, file: 'sermons48.xml' },
  { catalogLo: 2812, catalogHi: 2863, file: 'sermons49.xml' },
  { catalogLo: 2864, catalogHi: 2915, file: 'sermons50.xml' },
  { catalogLo: 2916, catalogHi: 2967, file: 'sermons51.xml' },
  { catalogLo: 2968, catalogHi: 3019, file: 'sermons52.xml' },
  { catalogLo: 3020, catalogHi: 3072, file: 'sermons53.xml' },
  { catalogLo: 3073, catalogHi: 3124, file: 'sermons54.xml' },
  { catalogLo: 3125, catalogHi: 3177, file: 'sermons55.xml' },
  { catalogLo: 3178, catalogHi: 3230, file: 'sermons56.xml' },
  { catalogLo: 3231, catalogHi: 3282, file: 'sermons57.xml' },
  { catalogLo: 3283, catalogHi: 3334, file: 'sermons58.xml' },
  { catalogLo: 3335, catalogHi: 3386, file: 'sermons59.xml' },
  { catalogLo: 3387, catalogHi: 3439, file: 'sermons60.xml' },
  { catalogLo: 3440, catalogHi: 3492, file: 'sermons61.xml' },
  { catalogLo: 3493, catalogHi: 3544, file: 'sermons62.xml' },
  { catalogLo: 3545, catalogHi: 3563, file: 'sermons63.xml' },
]

/** Highest Met Tab catalog number covered by {@link ccelSpurgeonVolumeUrlForCatalogNo} (inclusive). */
export function spurgeonMetTabCcelMaxCatalogNumber(): number {
  return Math.max(...SPURGEON_CCEL_VOLUME_FILES.map((v) => v.catalogHi))
}

/** Ordered CCEL volume XML URLs for all mapped Met Tab sermons (`sermons01.xml` … `sermons63.xml`). */
export function ccelSpurgeonMetTabVolumeUrls(base: string = CCEL_SPURGEON_SERMONS_BASE): string[] {
  const b = base.replace(/\/?$/, '/')
  return SPURGEON_CCEL_VOLUME_FILES.map((v) => `${b}${v.file}`)
}

/** Full URL for the CCEL volume that should contain Met Tab sermon catalog number `n`, or `null` if unmapped. */
export function ccelSpurgeonVolumeUrlForCatalogNo(
  n: number,
  base: string = CCEL_SPURGEON_SERMONS_BASE
): string | null {
  if (!Number.isFinite(n) || n < 1) return null
  const row = SPURGEON_CCEL_VOLUME_FILES.find((v) => n >= v.catalogLo && n <= v.catalogHi)
  if (!row) return null
  return `${base.replace(/\/?$/, '/')}${row.file}`
}
