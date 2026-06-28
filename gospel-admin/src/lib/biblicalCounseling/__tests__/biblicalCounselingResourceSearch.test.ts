/**
 * @jest-environment jsdom
 */

import {
  BIBLICAL_COUNSELING_REFERENCE_SLUG,
  BIBLICAL_COUNSELING_SECULAR_MAP_TEST_SLUG,
} from '@/lib/biblicalCounseling/biblicalCounselingReference'
import {
  runBiblicalCounselingResourceSearch,
} from '@/lib/biblicalCounseling/biblicalCounselingResourceSearch'
import type { SecularTermMapFile } from '@/lib/biblicalCounseling/secularTermMap'
import {
  RESOURCE_SEARCH_MATCH_ATTR,
} from '@/lib/profileResourceInPageSearch'

const testSecularTermMap: SecularTermMapFile = {
  pinnedSectionTitle: 'Find your topic (secular terms)',
  introHtml: '',
  mappings: [
    {
      secularTerms: ['self-esteem', 'self esteem'],
      biblicalTopic: 'Pride and Humility',
    },
  ],
}

describe('biblicalCounselingResourceSearch', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('returns mapping hint on counseling reference when query maps and matches', () => {
    const scope = document.createElement('div')
    scope.innerHTML = `
      <section id="section-1">
        <h3>Find your topic (secular terms)</h3>
        <table><tr><td>self-esteem</td><td>Pride and humility</td></tr></table>
      </section>
      <section id="section-2">
        <h3>Pride and humility</h3>
        <p>self-esteem appears here too</p>
      </section>
    `
    document.body.appendChild(scope)

    const result = runBiblicalCounselingResourceSearch(
      scope,
      'self-esteem',
      BIBLICAL_COUNSELING_REFERENCE_SLUG,
      { secularTermMap: testSecularTermMap }
    )
    expect(result.count).toBeGreaterThan(0)
    expect(result.mappingHint?.biblicalTopic).toBe('Pride and Humility')
    expect(scope.querySelector(`mark[${RESOURCE_SEARCH_MATCH_ATTR}]`)).toBeTruthy()
  })

  it('does not return mapping hint for other profiles', () => {
    const scope = document.createElement('div')
    scope.innerHTML = '<p>self-esteem</p>'
    document.body.appendChild(scope)

    const result = runBiblicalCounselingResourceSearch(scope, 'self-esteem', 'default')
    expect(result.mappingHint).toBeNull()
  })

  it('returns mapping hint on secular map test profile', () => {
    const scope = document.createElement('div')
    scope.innerHTML =
      '<section id="section-1"><p>self-esteem maps to Pride and humility</p></section>'
    document.body.appendChild(scope)

    const result = runBiblicalCounselingResourceSearch(
      scope,
      'self-esteem',
      BIBLICAL_COUNSELING_SECULAR_MAP_TEST_SLUG,
      { secularTermMap: testSecularTermMap }
    )
    expect(result.mappingHint?.biblicalTopic).toBe('Pride and Humility')
  })

  it('runBiblicalCounselingResourceSearch prioritizes mapping section matches', () => {
    const scope = document.createElement('div')
    scope.innerHTML = `
      <section id="section-1">
        <h3>Find your topic (secular terms)</h3>
        <p>self-esteem</p>
      </section>
      <section id="section-2">
        <h3>Pride and humility</h3>
        <p>self-esteem topic body</p>
      </section>
    `
    document.body.appendChild(scope)

    const result = runBiblicalCounselingResourceSearch(
      scope,
      'self-esteem',
      BIBLICAL_COUNSELING_REFERENCE_SLUG,
      { secularTermMap: testSecularTermMap }
    )
    expect(result.count).toBeGreaterThan(1)
    const mark = scope.querySelector(`mark[${RESOURCE_SEARCH_MATCH_ATTR}]`)
    expect(mark?.closest('#section-1')).toBeTruthy()
  })

  it('uses optional secularTermMap override for lookup', () => {
    const scope = document.createElement('div')
    scope.innerHTML = '<section id="section-1"><p>custom-term</p></section>'
    document.body.appendChild(scope)

    const customMap = {
      pinnedSectionTitle: 'Find your topic (secular terms)',
      introHtml: '',
      mappings: [
        {
          secularTerms: ['custom-term'],
          biblicalTopic: 'Custom Biblical Topic',
        },
      ],
    }

    const result = runBiblicalCounselingResourceSearch(
      scope,
      'custom-term',
      BIBLICAL_COUNSELING_REFERENCE_SLUG,
      { secularTermMap: customMap }
    )
    expect(result.mappingHint?.biblicalTopic).toBe('Custom Biblical Topic')
  })
})
