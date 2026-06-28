import {
  applyProfileResourceSearchMarks,
  buildProfileResourceSearchPlainText,
  clearProfileResourceSearchMarks,
  findProfileResourceSearchMatches,
  RESOURCE_SEARCH_ACTIVE_ATTR,
  RESOURCE_SEARCH_MATCH_ATTR,
  RESOURCE_SEARCH_MATCH_SCROLL_GAP_PX,
  isProfileResourceSearchMarkInComfortZone,
  runProfileResourceSearch,
  scrollProfileResourceSearchToMark,
  setProfileResourceSearchActiveIndex,
} from '@/lib/profileResourceInPageSearch'
import { isMemorizeIosWebHost } from '@/lib/memorizationViewportPlatform'
import { FALLBACK_HEADER_OFFSET } from '@/lib/scrollToTocAnchor'

jest.mock('@/lib/memorizationViewportPlatform', () => ({
  ...jest.requireActual('@/lib/memorizationViewportPlatform'),
  isMemorizeIosWebHost: jest.fn(() => false),
}))

const mockIsMemorizeIosWebHost = isMemorizeIosWebHost as jest.MockedFunction<
  typeof isMemorizeIosWebHost
>

function mockStickyHeaderBottom(bottom: number): void {
  const header = document.createElement('div')
  header.setAttribute('data-profile-sticky-header', '')
  document.body.appendChild(header)
  jest.spyOn(header, 'getBoundingClientRect').mockReturnValue({
    top: 0,
    bottom,
    left: 0,
    right: 0,
    width: 0,
    height: bottom,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
}

function mountScope(html: string): HTMLElement {
  const scope = document.createElement('main')
  scope.innerHTML = html
  document.body.appendChild(scope)
  return scope
}

describe('profileResourceInPageSearch', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    mockIsMemorizeIosWebHost.mockReturnValue(false)
  })

  it('buildProfileResourceSearchPlainText excludes gospel mounts', () => {
    const scope = mountScope(
      '<p>Hello <span data-gospel-mount="scripture">John 3:16</span> world</p>'
    )
    expect(buildProfileResourceSearchPlainText(scope)).toBe('Hello  world')
  })

  it('findProfileResourceSearchMatches is case-insensitive', () => {
    expect(findProfileResourceSearchMatches('Hello World hello', 'HEL')).toEqual([
      { start: 0, end: 3 },
      { start: 12, end: 15 },
    ])
  })

  it('wraps the active match and clears marks', () => {
    const scope = mountScope('<p>Alpha beta alpha</p>')
    const ranges = findProfileResourceSearchMatches(
      buildProfileResourceSearchPlainText(scope),
      'alpha'
    )
    const marks = applyProfileResourceSearchMarks(scope, ranges, 1)
    expect(marks).toHaveLength(1)
    expect(scope.querySelectorAll(`mark[${RESOURCE_SEARCH_MATCH_ATTR}]`)).toHaveLength(1)
    expect(marks[0]?.getAttribute(RESOURCE_SEARCH_ACTIVE_ATTR)).toBe('true')
    expect(marks[0]?.textContent?.toLowerCase()).toBe('alpha')

    clearProfileResourceSearchMarks(scope)
    expect(scope.querySelectorAll(`mark[${RESOURCE_SEARCH_MATCH_ATTR}]`)).toHaveLength(0)
    expect(scope.textContent).toBe('Alpha beta alpha')
  })

  it('setProfileResourceSearchActiveIndex updates active mark', () => {
    const mark = document.createElement('mark')
    const marks = [mark]
    setProfileResourceSearchActiveIndex(marks, 0)
    expect(mark.getAttribute(RESOURCE_SEARCH_ACTIVE_ATTR)).toBe('true')
  })

  it('scrollProfileResourceSearchToMark scrolls below sticky profile header', () => {
    mockStickyHeaderBottom(96)

    const mark = document.createElement('mark')
    document.body.appendChild(mark)
    jest.spyOn(mark, 'getBoundingClientRect').mockReturnValue({
      top: 20,
      left: 0,
      right: 0,
      bottom: 40,
      width: 0,
      height: 20,
      x: 0,
      y: 20,
      toJSON: () => ({}),
    })
    Object.defineProperty(window, 'scrollY', { value: 300, configurable: true, writable: true })
    const scrollSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => {})

    scrollProfileResourceSearchToMark(mark)

    expect(scrollSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        top: 300 + 20 - (96 + RESOURCE_SEARCH_MATCH_SCROLL_GAP_PX),
      })
    )

    scrollSpy.mockRestore()
  })

  it('scrollProfileResourceSearchToMark uses instant window.scrollTo on iOS when search input is focused', () => {
    mockIsMemorizeIosWebHost.mockReturnValue(true)
    mockStickyHeaderBottom(120)

    const input = document.createElement('input')
    input.setAttribute('aria-label', 'Search in resource')
    document.body.appendChild(input)
    input.focus()

    const mark = document.createElement('mark')
    document.body.appendChild(mark)
    jest.spyOn(mark, 'getBoundingClientRect').mockReturnValue({
      top: 600,
      left: 0,
      right: 0,
      bottom: 620,
      width: 0,
      height: 20,
      x: 0,
      y: 600,
      toJSON: () => ({}),
    })
    Object.defineProperty(window, 'scrollY', { value: 100, configurable: true, writable: true })
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: { offsetTop: 0, height: 500, width: 390, scale: 1 },
    })
    const scrollIntoViewSpy = jest.spyOn(mark, 'scrollIntoView').mockImplementation(() => {})
    const scrollSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => {})

    scrollProfileResourceSearchToMark(mark)

    expect(scrollSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        top: 100 + 600 - (120 + RESOURCE_SEARCH_MATCH_SCROLL_GAP_PX),
        behavior: 'auto',
      })
    )
    expect(scrollIntoViewSpy).not.toHaveBeenCalled()

    scrollIntoViewSpy.mockRestore()
    scrollSpy.mockRestore()
  })

  it('scrollProfileResourceSearchToMark skips scroll on iOS when the match is already visible', () => {
    mockIsMemorizeIosWebHost.mockReturnValue(true)
    mockStickyHeaderBottom(80)

    const mark = document.createElement('mark')
    document.body.appendChild(mark)
    jest.spyOn(mark, 'getBoundingClientRect').mockReturnValue({
      top: 200,
      left: 0,
      right: 0,
      bottom: 220,
      width: 0,
      height: 20,
      x: 0,
      y: 200,
      toJSON: () => ({}),
    })
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: { offsetTop: 0, height: 500, width: 390, scale: 1 },
    })
    const scrollIntoViewSpy = jest.spyOn(mark, 'scrollIntoView').mockImplementation(() => {})
    const scrollSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => {})

    scrollProfileResourceSearchToMark(mark)

    expect(scrollIntoViewSpy).not.toHaveBeenCalled()
    expect(scrollSpy).not.toHaveBeenCalled()

    scrollIntoViewSpy.mockRestore()
    scrollSpy.mockRestore()
  })

  it('isProfileResourceSearchMarkInComfortZone respects header and visual viewport', () => {
    const mark = document.createElement('mark')
    jest.spyOn(mark, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      left: 0,
      right: 0,
      bottom: 120,
      width: 0,
      height: 20,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    })
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: { offsetTop: 0, height: 500, width: 390, scale: 1 },
    })

    expect(isProfileResourceSearchMarkInComfortZone(mark, 80)).toBe(true)
    expect(isProfileResourceSearchMarkInComfortZone(mark, 120)).toBe(false)
  })

  it('scrollProfileResourceSearchToMark uses fallback header offset when chrome is missing', () => {
    const mark = document.createElement('mark')
    document.body.appendChild(mark)
    jest.spyOn(mark, 'getBoundingClientRect').mockReturnValue({
      top: 20,
      left: 0,
      right: 0,
      bottom: 40,
      width: 0,
      height: 20,
      x: 0,
      y: 20,
      toJSON: () => ({}),
    })
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true })
    const scrollSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => {})

    scrollProfileResourceSearchToMark(mark)

    expect(scrollSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        top: 0,
      })
    )

    scrollSpy.mockRestore()
  })

  it('runProfileResourceSearch returns count and scrollToIndex', () => {
    const scope = mountScope('<p>find me find</p>')
    const scrollSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => {})

    const result = runProfileResourceSearch(scope, 'find', { activeIndex: 0 })
    expect(result.count).toBe(2)
    expect(scope.querySelectorAll(`mark[${RESOURCE_SEARCH_MATCH_ATTR}]`)).toHaveLength(1)
    expect(scrollSpy).toHaveBeenCalled()

    result.scrollToIndex(1)
    const marks = Array.from(
      scope.querySelectorAll<HTMLElement>(`mark[${RESOURCE_SEARCH_MATCH_ATTR}]`)
    )
    expect(marks).toHaveLength(1)
    expect(marks[0]?.getAttribute(RESOURCE_SEARCH_ACTIVE_ATTR)).toBe('true')

    result.clear()
    expect(scope.querySelectorAll(`mark[${RESOURCE_SEARCH_MATCH_ATTR}]`)).toHaveLength(0)

    scrollSpy.mockRestore()
  })

  it.each(['abus', 'abuse'])(
    'wraps full and partial heading title matches without block edge marks (%s)',
    (query) => {
      const scope = mountScope(`
      <section>
        <h3><div class="contents">Abuse</div></h3>
        <p>Resources on Abuse and more.</p>
      </section>
    `)
      runProfileResourceSearch(scope, query, { activeIndex: 0 })
      const marks = Array.from(
        scope.querySelectorAll<HTMLElement>(`mark[${RESOURCE_SEARCH_MATCH_ATTR}]`)
      )
      expect(marks.every((m) => (m.textContent ?? '').trim().length > 0)).toBe(true)
      expect(marks.every((m) => !m.querySelector('h3, p, div.contents'))).toBe(true)
      const headingMark = scope.querySelector(
        `h3 mark[${RESOURCE_SEARCH_MATCH_ATTR}]`
      )
      expect(headingMark).toBeTruthy()
      expect(headingMark?.textContent?.toLowerCase()).toBe(query)
    }
  )

  it('searching for (prefix of fear) highlights in links without corrupting labels', () => {
    const scope = mountScope(`
      <section><h3><div class="contents">Abuse</div></h3>
        <div><a data-tour="external-resource-card" class="inline-flex"><span>A Fight For Life</span></a></div>
      </section>
    `)
    const result = runProfileResourceSearch(scope, 'for')
    const link = scope.querySelector('[data-tour="external-resource-card"]')
    expect(link?.textContent?.trim()).toBe('A Fight For Life')
    expect(result.count).toBeGreaterThan(0)
    expect(link?.querySelector('mark')?.textContent?.toLowerCase()).toBe('for')
  })

  it('skips phantom matches that span adjacent blocks (Life + Abuse → fea)', () => {
    const scope = mountScope(`
      <p>Culture of Life</p>
      <h3><div class="contents">Abuse</div></h3>
    `)
    runProfileResourceSearch(scope, 'fea')
    expect([...scope.querySelectorAll('h3')].map((h) => h.textContent)).toEqual(['Abuse'])
    expect(scope.querySelectorAll(`mark[${RESOURCE_SEARCH_MATCH_ATTR}]`)).toHaveLength(0)
  })

  it('searches external resource link labels without corrupting link text', () => {
    const scope = mountScope(`
      <section><h3><div class="contents">Fear</div></h3>
        <div><a data-tour="external-resource-card" class="inline-flex"><span>Overcoming Fear</span></a></div>
      </section>
    `)
    const result = runProfileResourceSearch(scope, 'fear')
    expect(result.count).toBe(2)
    expect(scope.querySelectorAll(`mark[${RESOURCE_SEARCH_MATCH_ATTR}]`)).toHaveLength(1)
    expect(scope.querySelector('[data-tour="external-resource-card"]')?.textContent?.trim()).toBe(
      'Overcoming Fear'
    )
  })

  it('searching fea does not split Life link text into Abuse heading (phantom cross-block match)', () => {
    const scope = mountScope(`
      <section><h3><div class="contents">Abortion</div></h3>
        <div><a data-tour="external-resource-card" class="inline-flex"><span>Creating a Culture of Life in the Local Church</span></a></div>
      </section>
      <section><h3><div class="contents">Abuse</div></h3>
        <div>
          <a data-tour="external-resource-card" class="inline-flex"><span>A Fight For Life</span></a>
          <a data-tour="external-resource-card" class="inline-flex"><span>Sword Words</span></a>
        </div>
      </section>
      <section><h3><div class="contents">Fear</div></h3>
        <p>Counseling for fear and anxiety.</p>
        <div><a data-tour="external-resource-card" class="inline-flex"><span>Overcoming Fear</span></a></div>
      </section>
    `)
    runProfileResourceSearch(scope, 'fea')
    expect([...scope.querySelectorAll('h3')].map((h) => h.textContent)).toEqual([
      'Abortion',
      'Abuse',
      'Fear',
    ])
    expect(
      [...scope.querySelectorAll('[data-tour="external-resource-card"]')].map((a) =>
        a.textContent?.trim()
      )
    ).toEqual([
      'Creating a Culture of Life in the Local Church',
      'A Fight For Life',
      'Sword Words',
      'Overcoming Fear',
    ])
  })

  it('searching fear does not break section headings or external link labels', () => {
    const scope = mountScope(`
      <section><h3><div class="contents">Abortion</div></h3>
        <div><a data-tour="external-resource-card" class="inline-flex"><span>Creating a Culture of Life in the Local Church</span></a></div>
      </section>
      <section><h3><div class="contents">Abuse</div></h3>
        <div>
          <a data-tour="external-resource-card" class="inline-flex"><span>A Fight For Life</span></a>
          <a data-tour="external-resource-card" class="inline-flex"><span>Sword Words</span></a>
        </div>
      </section>
      <section><h3><div class="contents">Fear</div></h3>
        <p>Counseling for fear and anxiety.</p>
        <div><a data-tour="external-resource-card" class="inline-flex"><span>Overcoming Fear</span></a></div>
      </section>
    `)
    const result = runProfileResourceSearch(scope, 'fear')
    expect([...scope.querySelectorAll('h3')].map((h) => h.textContent)).toEqual([
      'Abortion',
      'Abuse',
      'Fear',
    ])
    expect(
      [...scope.querySelectorAll('[data-tour="external-resource-card"]')].map((a) =>
        a.textContent?.trim()
      )
    ).toEqual([
      'Creating a Culture of Life in the Local Church',
      'A Fight For Life',
      'Sword Words',
      'Overcoming Fear',
    ])
    expect(result.count).toBeGreaterThanOrEqual(3)
    expect(scope.querySelectorAll(`mark[${RESOURCE_SEARCH_MATCH_ATTR}]`)).toHaveLength(1)
    result.scrollToIndex(2)
    expect(scope.querySelector(`mark[${RESOURCE_SEARCH_MATCH_ATTR}]`)).toBeTruthy()
  })

  it('highlights only the active match when many results exist', () => {
    const links = Array.from(
      { length: 300 },
      (_, i) =>
        `<a data-tour="external-resource-card"><span>since counsel ${i}</span></a>`
    ).join('')
    const scope = mountScope(`<div>${links}</div>`)
    const result = runProfileResourceSearch(scope, 'sin')
    expect(result.count).toBe(300)
    expect(scope.querySelectorAll(`mark[${RESOURCE_SEARCH_MATCH_ATTR}]`)).toHaveLength(1)
    result.scrollToIndex(50)
    expect(scope.querySelectorAll(`mark[${RESOURCE_SEARCH_MATCH_ATTR}]`)).toHaveLength(1)
  })

  it('runProfileResourceSearch with empty query clears highlights', () => {
    const scope = mountScope('<p>test test</p>')
    runProfileResourceSearch(scope, 'test')
    expect(scope.querySelectorAll(`mark[${RESOURCE_SEARCH_MATCH_ATTR}]`)).toHaveLength(1)

    const empty = runProfileResourceSearch(scope, '   ')
    expect(empty.count).toBe(0)
    expect(scope.querySelectorAll(`mark[${RESOURCE_SEARCH_MATCH_ATTR}]`)).toHaveLength(0)
  })

  it('container scroll mode scrolls within the scroll container', () => {
    const container = document.createElement('div')
    container.style.height = '100px'
    container.style.overflow = 'auto'
    const scope = document.createElement('div')
    scope.innerHTML = '<p style="height: 400px">alpha</p><p>beta beta beta</p>'
    container.appendChild(scope)
    document.body.appendChild(container)

    const scrollBy = jest.fn()
    Object.defineProperty(container, 'scrollBy', { value: scrollBy, configurable: true })

    const result = runProfileResourceSearch(scope, 'beta', {
      scroll: { mode: 'container', scrollContainer: container },
    })
    expect(result.count).toBe(3)
    expect(scrollBy).toHaveBeenCalled()
  })

  it('highlights secular term map table matches inside cells without breaking table rows', () => {
    const scope = mountScope(`
      <div class="content">
        <table class="secular-term-map-table">
          <tbody>
            <tr><td>spanking, child discipline</td><td>→ Discipline</td></tr>
            <tr><td>divorce, separated, considering divorce</td><td>→ <a href="#section-5">Divorce</a></td></tr>
          </tbody>
        </table>
      </div>
    `)

    const result = runProfileResourceSearch(scope, 'divorce')
    expect(result.count).toBeGreaterThan(0)

    const mark = scope.querySelector(`mark[${RESOURCE_SEARCH_MATCH_ATTR}]`)
    expect(mark).toBeTruthy()
    expect(scope.querySelector('tbody > mark')).toBeNull()
    expect(mark?.closest('td')).toBeTruthy()
    expect(scope.querySelectorAll('table.secular-term-map-table tr')).toHaveLength(2)
  })
})
