/** Default CCEL ThML base for Spurgeon’s *New Park Street* / *Metropolitan Tabernacle* volumes. */
export const CCEL_SPURGEON_SERMONS_BASE = 'https://www.ccel.org/ccel/spurgeon/'

/**
 * Inclusive catalog ranges per `sermonsNN.xml` (verified against CCEL `div1` titles).
 * Gaps in the Met Tab sequence (e.g. 423–426) are **not** in any file; those numbers return `null`.
 */
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
]

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
