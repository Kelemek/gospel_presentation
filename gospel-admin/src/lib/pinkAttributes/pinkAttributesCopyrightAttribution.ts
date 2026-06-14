/** Anchor on `/copyright` for the Chapel Library edition attribution block. */
export const PINK_ATTRIBUTES_COPYRIGHT_ANCHOR_ID = 'pink-attributes-chapel'

export const PINK_ATTRIBUTES_COPYRIGHT_PAGE_HREF = `/copyright#${PINK_ATTRIBUTES_COPYRIGHT_ANCHOR_ID}`

export const PINK_ATTRIBUTES_CHAPEL_SOURCE_URL =
  'https://www.chapellibrary.org/api/books/download?code=aogo&format=pdf'

/**
 * Verbatim Chapel Library copyright page (edition aogo). Wording must not be paraphrased.
 * @see gospel-admin/data/pink-attributes/chapters.json
 */
export const PINK_ATTRIBUTES_CHAPEL_COPYRIGHT_NOTICE = {
  title: 'The Attributes of God (A.W. Pink) — Chapel Library edition',
  editionLine:
    'The Attributes of God, by A. W. Pink. First Printing 1930. First Chapel Library edition 1993. Printed in the United States of America.',
  copyrightGrant:
    '© Copyright 1993 by Chapel Library (this edition), Pensacola, Florida. Permission is expressly granted to reproduce this material by any means, provided:',
  condition1: '(1) it is not charged for beyond a nominal sum for cost of duplication',
  condition2: '(2) this copyright notice and all the text on this page is included.',
  studyGuide:
    'A Study Guide is also available for this text, either in print or with this paperback text for online download from our web site. For copies or information on other Bible correspondence courses, please contact Mount Zion Bible Institute at the same address.',
  publisherLine: 'Chapel Library, 2603 West Wright St., Pensacola, Florida 32505 USA',
  sourceLabel: 'Chapel Library edition (PDF)',
  sourceHref: PINK_ATTRIBUTES_CHAPEL_SOURCE_URL,
} as const
