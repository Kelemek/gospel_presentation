import { gospelStorageGetSync, gospelStorageSetSync } from '@/lib/gospelClientStorage'
import { installTestLocalStorage, resetGospelStorageTestState } from '@/lib/testing/testLocalStorage'
import {
  buildProfileRecentScriptureHref,
  isProfileAppLaunchEntryPath,
  loadProfileLastActiveSlug,
  loadProfileLastOpenResource,
  loadProfileRecentResources,
  loadProfileRecentResourcesForMenu,
  loadProfileRecentScriptures,
  loadProfileRecentScripturesForMenu,
  shouldSkipProfileAppLaunchResume,
  PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY,
  PROFILE_RECENT_MENU_MAX,
  PROFILE_RECENT_RESOURCES_STORED_MAX,
  PROFILE_RECENT_SCRIPTURES_STORED_MAX,
  recordProfileLastOpenOnEnter,
  recordScriptureLastOpen,
  resetProfileLastOpenNavigationRefsForTests,
} from '../profileLastOpenResourceStorage'

describe('profileLastOpenResourceStorage', () => {
  beforeEach(async () => {
    await resetGospelStorageTestState()
    installTestLocalStorage()
    resetProfileLastOpenNavigationRefsForTests()
  })

  it('records current profile on first enter', () => {
    recordProfileLastOpenOnEnter('default', 'The Gospel')
    expect(loadProfileRecentResources()).toEqual([{ slug: 'default', title: 'The Gospel' }])
  })

  it('prepends most recent and caps stored history (current + menu max)', () => {
    const slugs = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    for (const slug of slugs) {
      recordProfileLastOpenOnEnter(slug, `Title ${slug}`)
    }
    expect(loadProfileRecentResources()).toEqual([
      { slug: 'g', title: 'Title g' },
      { slug: 'f', title: 'Title f' },
      { slug: 'e', title: 'Title e' },
      { slug: 'd', title: 'Title d' },
      { slug: 'c', title: 'Title c' },
      { slug: 'b', title: 'Title b' },
    ])
    expect(loadProfileRecentResources().length).toBe(PROFILE_RECENT_RESOURCES_STORED_MAX)
  })

  it('loadProfileRecentResourcesForMenu returns up to five excluding current', () => {
    const slugs = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    for (const slug of slugs) {
      recordProfileLastOpenOnEnter(slug, `Title ${slug}`)
    }
    const menu = loadProfileRecentResourcesForMenu('g')
    expect(menu).toHaveLength(PROFILE_RECENT_MENU_MAX)
    expect(menu.map((r) => r.slug)).toEqual(['f', 'e', 'd', 'c', 'b'])
    expect(menu.some((r) => r.slug === 'g')).toBe(false)
  })

  it('moves slug to front when revisited', () => {
    recordProfileLastOpenOnEnter('a', 'Resource A')
    recordProfileLastOpenOnEnter('b', 'Resource B')
    recordProfileLastOpenOnEnter('c', 'Resource C')
    recordProfileLastOpenOnEnter('a', 'Resource A again')

    expect(loadProfileRecentResources()).toEqual([
      { slug: 'a', title: 'Resource A again' },
      { slug: 'c', title: 'Resource C' },
      { slug: 'b', title: 'Resource B' },
    ])
  })

  it('updates title when same slug re-enters with new title', () => {
    recordProfileLastOpenOnEnter('same', 'Title One')
    recordProfileLastOpenOnEnter('same', 'Title Two')

    expect(loadProfileRecentResources()).toEqual([{ slug: 'same', title: 'Title Two' }])
  })

  it('migrates v1 single entry on load', () => {
    gospelStorageSetSync(
      PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY,
      JSON.stringify({ v: 1, slug: 'legacy', title: 'Legacy Title' })
    )

    expect(loadProfileRecentResources()).toEqual([{ slug: 'legacy', title: 'Legacy Title' }])
  })

  it('persists v3 shape on profile write', () => {
    recordProfileLastOpenOnEnter('x', 'X')
    const raw = gospelStorageGetSync(PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY)
    expect(JSON.parse(raw!)).toEqual({
      v: 3,
      resources: [{ slug: 'x', title: 'X' }],
      scriptures: [],
    })
  })

  it('migrates v2 payload and preserves empty scriptures', () => {
    gospelStorageSetSync(
      PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY,
      JSON.stringify({
        v: 2,
        resources: [{ slug: 'old', title: 'Old' }],
      })
    )
    expect(loadProfileRecentResources()).toEqual([{ slug: 'old', title: 'Old' }])
    expect(loadProfileRecentScriptures()).toEqual([])
  })

  it('records scriptures with dedupe and cap', () => {
    for (let i = 0; i < 7; i += 1) {
      recordScriptureLastOpen({
        slug: 'default',
        profileTitle: 'Gospel',
        reference: `Ref ${i}`,
        sectionId: 'section-1',
        subsectionId: 'section-1-0',
      })
    }
    expect(loadProfileRecentScriptures()).toHaveLength(PROFILE_RECENT_SCRIPTURES_STORED_MAX)
    expect(loadProfileRecentScriptures()[0]?.reference).toBe('Ref 6')

    recordScriptureLastOpen({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'Ref 2',
      sectionId: 'section-1',
      subsectionId: 'section-1-0',
      chapterView: true,
    })
    expect(loadProfileRecentScriptures()[0]).toMatchObject({
      reference: 'Ref 2',
      chapterView: true,
    })
    expect(loadProfileRecentScriptures().filter((s) => s.reference === 'Ref 2')).toHaveLength(1)
  })

  it('dedupes same reference on one profile when anchors differ', () => {
    recordScriptureLastOpen({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'John 3:16',
      sectionId: 'section-1',
      subsectionId: 'section-1-0',
    })
    recordScriptureLastOpen({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'John 3:16',
      sectionId: 'modal-view',
      subsectionId: 'modal-view',
      chapterView: true,
    })
    const list = loadProfileRecentScriptures()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({
      reference: 'John 3:16',
      sectionId: 'modal-view',
      subsectionId: 'modal-view',
      chapterView: true,
    })
  })

  it('profile enter preserves scriptures list', () => {
    recordScriptureLastOpen({
      slug: 'sg',
      profileTitle: 'Spurgeon',
      reference: 'John 3:16',
      sectionId: 'section-1',
      subsectionId: 'section-1-0',
    })
    recordProfileLastOpenOnEnter('default', 'Gospel')
    expect(loadProfileRecentScriptures()[0]?.reference).toBe('John 3:16')
    expect(loadProfileRecentResources()[0]?.slug).toBe('default')
  })

  it('loadProfileRecentScripturesForMenu returns up to PROFILE_RECENT_MENU_MAX', () => {
    for (let i = 0; i < 6; i += 1) {
      recordScriptureLastOpen({
        slug: 'default',
        profileTitle: 'Gospel',
        reference: `R${i}`,
        sectionId: 'section-1',
        subsectionId: 'section-1-0',
      })
    }
    expect(loadProfileRecentScriptures()).toHaveLength(PROFILE_RECENT_SCRIPTURES_STORED_MAX)
    expect(loadProfileRecentScripturesForMenu()).toHaveLength(PROFILE_RECENT_MENU_MAX)
  })

  it('buildProfileRecentScriptureHref includes scriptureRef and optional chapter view', () => {
    expect(
      buildProfileRecentScriptureHref({
        slug: 'default',
        profileTitle: 'Gospel',
        reference: 'John 3:16',
        sectionId: 'section-1',
        subsectionId: 'section-1-0',
        openedAt: 1,
      })
    ).toBe('/default?scriptureRef=John+3%3A16')

    expect(
      buildProfileRecentScriptureHref({
        slug: 'sg',
        profileTitle: 'Spurgeon',
        reference: 'Romans 8:1',
        sectionId: 'section-2',
        subsectionId: 'section-2-0',
        chapterView: true,
        openedAt: 2,
      })
    ).toBe('/sg?scriptureRef=Romans+8%3A1&scriptureView=chapter')
  })

  it('loadProfileRecentResourcesForMenu excludes current slug', () => {
    recordProfileLastOpenOnEnter('a', 'A')
    recordProfileLastOpenOnEnter('b', 'B')
    recordProfileLastOpenOnEnter('c', 'C')

    expect(loadProfileRecentResourcesForMenu('b')).toEqual([
      { slug: 'c', title: 'C' },
      { slug: 'a', title: 'A' },
    ])
  })

  it('loadProfileLastOpenResource returns first entry', () => {
    recordProfileLastOpenOnEnter('first', 'First')
    recordProfileLastOpenOnEnter('second', 'Second')
    expect(loadProfileLastOpenResource()).toEqual({ slug: 'second', title: 'Second' })
  })

  it('loadProfileLastActiveSlug returns most recent slug', () => {
    recordProfileLastOpenOnEnter('a', 'A')
    recordProfileLastOpenOnEnter('b', 'B')
    expect(loadProfileLastActiveSlug()).toBe('b')
  })

  it('classifies launch entry and skip paths', () => {
    expect(isProfileAppLaunchEntryPath('/')).toBe(true)
    expect(isProfileAppLaunchEntryPath('/default')).toBe(true)
    expect(isProfileAppLaunchEntryPath('/default/')).toBe(true)
    expect(isProfileAppLaunchEntryPath('/other')).toBe(false)
    expect(shouldSkipProfileAppLaunchResume('/admin')).toBe(true)
    expect(shouldSkipProfileAppLaunchResume('/login')).toBe(true)
    expect(shouldSkipProfileAppLaunchResume('/spurgeon01')).toBe(false)
  })
})
