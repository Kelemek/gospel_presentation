/** Anchor on `/copyright` for ACBC outbound resource links. */
export const ACBC_EXTERNAL_LINKS_COPYRIGHT_ANCHOR_ID = 'acbc-external-resource-links'

export const ACBC_EXTERNAL_LINKS_COPYRIGHT_PAGE_HREF = `/copyright#${ACBC_EXTERNAL_LINKS_COPYRIGHT_ANCHOR_ID}`

export const ACBC_HOME_URL = 'https://biblicalcounseling.com/'

export const ACBC_RESOURCE_LIBRARY_URL = 'https://biblicalcounseling.com/resource-library/'

export const ACBC_TOPIC_INDEX_URL =
  'https://biblicalcounseling.com/resource-library/topic-index/'

export const ACBC_EXTERNAL_RESOURCE_LINKS_ATTRIBUTION = {
  title: 'Association of Certified Biblical Counselors (ACBC) — outbound links',
  body:
    'Some gospel profiles list teal “external resource” link cards under scripture references. Those links open the Association of Certified Biblical Counselors (ACBC) website in a new tab—they are pointers only; articles, podcasts, conference messages, and book pages remain on biblicalcounseling.com and are not reproduced in this app. The Biblical Counseling Scripture Reference profile curates links from ACBC topic indexes and resource library pages.',
  organizationLabel: 'biblicalcounseling.com',
  organizationHref: ACBC_HOME_URL,
  resourceLibraryLabel: 'ACBC resource library',
  resourceLibraryHref: ACBC_RESOURCE_LIBRARY_URL,
  topicIndexLabel: 'topic index',
  topicIndexHref: ACBC_TOPIC_INDEX_URL,
  closing:
    'Respect ACBC and each author’s rights to the linked material; use those resources according to the terms on biblicalcounseling.com.',
} as const
