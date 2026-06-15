import {
  type HodgeVolumeId,
  hodgeVolumeProfileTitle,
  hodgeVolumeSlug,
} from '@/lib/hodge/hodgeSlug'

export type HodgeCcelVolumeDef = {
  volume: HodgeVolumeId
  slug: ReturnType<typeof hodgeVolumeSlug>
  profileTitle: string
  xmlUrl: string
  sourceHref: string
}

/** CCEL Charles Hodge *Systematic Theology* — three volumes. */
export const HODGE_CCEL_VOLUMES: readonly HodgeCcelVolumeDef[] = [
  {
    volume: 1,
    slug: hodgeVolumeSlug(1),
    profileTitle: hodgeVolumeProfileTitle(1),
    xmlUrl: 'https://www.ccel.org/ccel/hodge/theology1.xml',
    sourceHref: 'https://www.ccel.org/ccel/hodge/theology1.html',
  },
  {
    volume: 2,
    slug: hodgeVolumeSlug(2),
    profileTitle: hodgeVolumeProfileTitle(2),
    xmlUrl: 'https://www.ccel.org/ccel/hodge/theology2.xml',
    sourceHref: 'https://www.ccel.org/ccel/hodge/theology2.html',
  },
  {
    volume: 3,
    slug: hodgeVolumeSlug(3),
    profileTitle: hodgeVolumeProfileTitle(3),
    xmlUrl: 'https://www.ccel.org/ccel/hodge/theology3.xml',
    sourceHref: 'https://www.ccel.org/ccel/hodge/theology3.html',
  },
]

export function allHodgeVolumeIds(): HodgeVolumeId[] {
  return HODGE_CCEL_VOLUMES.map((v) => v.volume)
}

export function hodgeVolumeById(volume: HodgeVolumeId): HodgeCcelVolumeDef {
  const found = HODGE_CCEL_VOLUMES.find((v) => v.volume === volume)
  if (!found) {
    throw new Error(`Unknown Hodge volume: ${volume}`)
  }
  return found
}
