/** CCEL policy page — linked from every public-domain CCEL attribution block. */
export const CCEL_COPYRIGHT_POLICY_URL = 'https://www.ccel.org/about/copyright.html'

export type CcelCopyrightAttribution = {
  /** Bold label on the copyright page (no trailing colon). */
  title: string
  /** Prose before “on the … CCEL” link; should state public-domain status and what was imported. */
  body: string
  /** Work- or author-index URL on ccel.org. */
  sourceHref: string
}

/** CCEL corpora imported via `npm run import-*` (keep in sync with docs/03-FEATURES.md). */
export const CCEL_COPYRIGHT_ATTRIBUTIONS: readonly CcelCopyrightAttribution[] = [
  {
    title: "John Bunyan, The Pilgrim's Progress",
    body: 'The underlying work is in the public domain. Text in this app was imported from the ThML edition',
    sourceHref: 'https://www.ccel.org/ccel/bunyan/pilgrim.html',
  },
  {
    title: 'John Calvin, Commentaries',
    body: 'The underlying commentaries are in the public domain. Text in this app was imported from the ThML commentary volumes',
    sourceHref: 'https://www.ccel.org/ccel/calvin/commentaries.html',
  },
  {
    title: 'Jonathan Edwards, Select Sermons',
    body: 'The underlying sermons are in the public domain. Sermon text in this app was imported from the ThML edition',
    sourceHref: 'https://www.ccel.org/ccel/edwards/sermons.html',
  },
  {
    title: "Matthew Henry's Commentary on the Whole Bible",
    body: 'The underlying commentary is in the public domain. Text in this app was imported from the six-volume ThML edition',
    sourceHref: 'https://www.ccel.org/ccel/henry/mhc.html',
  },
  {
    title: 'Martin Luther, Commentary on Galatians',
    body: 'The underlying commentary is in the public domain. Text in this app was imported from the ThML edition',
    sourceHref: 'https://www.ccel.org/ccel/luther/galatians.html',
  },
  {
    title: 'Charles H. Spurgeon, All of Grace',
    body: 'The underlying work is in the public domain. Text in this app was imported from the ThML edition',
    sourceHref: 'https://www.ccel.org/ccel/spurgeon/grace.html',
  },
  {
    title: 'Charles H. Spurgeon, Morning and Evening',
    body: 'The underlying devotions are in the public domain. Text in this app was imported from the ThML edition of Morning and Evening',
    sourceHref: 'https://www.ccel.org/ccel/spurgeon/morneve.html',
  },
  {
    title: 'Charles H. Spurgeon sermons',
    body: 'The underlying sermons are in the public domain. Sermon text in this app was imported from the ThML-encoded Metropolitan Tabernacle / New Park Street volumes',
    sourceHref: 'https://www.ccel.org/ccel/spurgeon/',
  },
]
