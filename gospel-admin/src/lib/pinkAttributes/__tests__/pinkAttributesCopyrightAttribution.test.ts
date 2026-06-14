import {
  PINK_ATTRIBUTES_CHAPEL_COPYRIGHT_NOTICE,
  PINK_ATTRIBUTES_COPYRIGHT_ANCHOR_ID,
  PINK_ATTRIBUTES_COPYRIGHT_PAGE_HREF,
} from '@/lib/pinkAttributes/pinkAttributesCopyrightAttribution'

describe('pinkAttributesCopyrightAttribution', () => {
  it('uses stable copyright anchor', () => {
    expect(PINK_ATTRIBUTES_COPYRIGHT_ANCHOR_ID).toBe('pink-attributes-chapel')
    expect(PINK_ATTRIBUTES_COPYRIGHT_PAGE_HREF).toBe('/copyright#pink-attributes-chapel')
  })

  it('includes verbatim Chapel notice sentences', () => {
    const n = PINK_ATTRIBUTES_CHAPEL_COPYRIGHT_NOTICE
    const combined = [
      n.editionLine,
      n.copyrightGrant,
      n.condition1,
      n.condition2,
      n.studyGuide,
      n.publisherLine,
    ].join(' ')

    expect(combined).toContain('First Chapel Library edition 1993')
    expect(combined).toContain('© Copyright 1993 by Chapel Library (this edition), Pensacola, Florida')
    expect(combined).toContain('Permission is expressly granted to reproduce this material by any means')
    expect(combined).toContain('it is not charged for beyond a nominal sum for cost of duplication')
    expect(combined).toContain('this copyright notice and all the text on this page is included')
    expect(combined).toContain('Mount Zion Bible Institute')
    expect(combined).toContain('2603 West Wright St., Pensacola, Florida 32505 USA')
  })
})
