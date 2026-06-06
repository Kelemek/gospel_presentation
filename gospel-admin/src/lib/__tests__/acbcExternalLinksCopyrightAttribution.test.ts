import {
  ACBC_EXTERNAL_LINKS_COPYRIGHT_ANCHOR_ID,
  ACBC_EXTERNAL_LINKS_COPYRIGHT_PAGE_HREF,
  ACBC_EXTERNAL_RESOURCE_LINKS_ATTRIBUTION,
  ACBC_HOME_URL,
  ACBC_RESOURCE_LIBRARY_URL,
  ACBC_SCRIPTURE_INDEX_URL,
  ACBC_TOPIC_INDEX_URL,
} from '@/lib/acbcExternalLinksCopyrightAttribution'

describe('acbcExternalLinksCopyrightAttribution', () => {
  it('defines copyright page anchor and href', () => {
    expect(ACBC_EXTERNAL_LINKS_COPYRIGHT_ANCHOR_ID).toBe('acbc-external-resource-links')
    expect(ACBC_EXTERNAL_LINKS_COPYRIGHT_PAGE_HREF).toBe(
      '/copyright#acbc-external-resource-links'
    )
  })

  it('points to ACBC site URLs', () => {
    expect(ACBC_HOME_URL).toBe('https://biblicalcounseling.com/')
    expect(ACBC_RESOURCE_LIBRARY_URL).toMatch(/resource-library/)
    expect(ACBC_TOPIC_INDEX_URL).toMatch(/topic-index/)
    expect(ACBC_SCRIPTURE_INDEX_URL).toMatch(/scripture-index/)
  })

  it('names ACBC in attribution title', () => {
    expect(ACBC_EXTERNAL_RESOURCE_LINKS_ATTRIBUTION.title).toMatch(/ACBC/)
    expect(ACBC_EXTERNAL_RESOURCE_LINKS_ATTRIBUTION.organizationHref).toBe(ACBC_HOME_URL)
  })
})
