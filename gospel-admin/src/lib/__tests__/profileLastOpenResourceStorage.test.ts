import { gospelStorageGetSync, gospelStorageSetSync } from '@/lib/gospelClientStorage'
import { installTestLocalStorage, resetGospelStorageTestState } from '@/lib/testing/testLocalStorage'
import {
  buildProfileRecentScriptureHref,
  isProfileAppLaunchEntryPath,
  loadProfileLastActiveSlug,
  loadProfileLastOpenResource,
  loadProfileRecentResources,
  loadProfileRecentResourcesForMenu,
  loadProfileRecentResourcesForTabs,
  loadProfileRecentScriptures,
  loadProfileRecentScripturesForMenu,
  getScriptureModalTabEntry,
  loadScriptureModalTabs,
  recordScriptureModalTab,
  removeProfileResourceTab,
  removeScriptureModalTab,
  resolveProfileTabNavigationAfterClose,
  resolveScriptureTabNavigationAfterClose,
  scriptureModalTabKey,
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
      resourceTabs: [{ slug: 'x', title: 'X' }],
      scriptureTabs: [],
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

  it('recordScriptureLastOpen stores translation on MRU scriptures', () => {
    recordScriptureLastOpen({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'John 3:16',
      sectionId: 's1',
      subsectionId: 's1-0',
      translation: 'nasb',
    })
    expect(loadProfileRecentScriptures()[0]?.translation).toBe('nasb')
    expect(buildProfileRecentScriptureHref(loadProfileRecentScriptures()[0]!)).toContain(
      'translation=nasb'
    )
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

  it('loadProfileRecentResourcesForTabs includes current profile when missing from stored tabs', () => {
    recordProfileLastOpenOnEnter('a', 'A')
    recordProfileLastOpenOnEnter('b', 'B')
    gospelStorageSetSync(
      PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY,
      JSON.stringify({
        v: 3,
        resources: [
          { slug: 'c', title: 'C' },
          { slug: 'b', title: 'B' },
          { slug: 'a', title: 'A' },
        ],
        scriptures: [],
        resourceTabs: [
          { slug: 'a', title: 'A' },
          { slug: 'b', title: 'B' },
        ],
      })
    )
    expect(loadProfileRecentResourcesForTabs('c', 'Current C').map((r) => r.slug)).toEqual([
      'a',
      'b',
      'c',
    ])
    expect(loadProfileRecentResourcesForTabs('c', 'Current C')[2]?.title).toBe('Current C')
  })

  it('loadProfileRecentResourcesForTabs keeps stored titles when slug is not in MRU resources', () => {
    gospelStorageSetSync(
      PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY,
      JSON.stringify({
        v: 3,
        resources: [{ slug: 'b', title: 'B' }],
        scriptures: [],
        resourceTabs: [
          { slug: 'a', title: 'Marriage Seminar' },
          { slug: 'b', title: 'B' },
        ],
      })
    )
    expect(loadProfileRecentResourcesForTabs().map((r) => r.title)).toEqual([
      'Marriage Seminar',
      'B',
    ])
  })

  it('loadProfileRecentResourcesForTabs keeps stable left-to-right order when revisiting', () => {
    recordProfileLastOpenOnEnter('a', 'A')
    recordProfileLastOpenOnEnter('b', 'B')
    recordProfileLastOpenOnEnter('c', 'C')
    expect(loadProfileRecentResourcesForTabs().map((r) => r.slug)).toEqual(['a', 'b', 'c'])

    recordProfileLastOpenOnEnter('a', 'A again')
    expect(loadProfileRecentResources().map((r) => r.slug)).toEqual(['a', 'c', 'b'])
    expect(loadProfileRecentResourcesForTabs().map((r) => r.slug)).toEqual(['a', 'b', 'c'])
    expect(loadProfileRecentResourcesForTabs()[0]?.title).toBe('A again')
  })

  it('loadProfileRecentResourcesForTabs caps at PROFILE_RECENT_MENU_MAX and drops oldest tab', () => {
    for (let i = 0; i < 6; i += 1) {
      recordProfileLastOpenOnEnter(`r${i}`, `Resource ${i}`)
    }
    expect(loadProfileRecentResources()).toHaveLength(PROFILE_RECENT_RESOURCES_STORED_MAX)
    expect(loadProfileRecentResourcesForTabs()).toHaveLength(PROFILE_RECENT_MENU_MAX)
    expect(loadProfileRecentResourcesForTabs().map((r) => r.slug)).toEqual([
      'r1',
      'r2',
      'r3',
      'r4',
      'r5',
    ])
  })

  it('resolveProfileTabNavigationAfterClose prefers tab to the right', () => {
    recordProfileLastOpenOnEnter('a', 'A')
    recordProfileLastOpenOnEnter('b', 'B')
    recordProfileLastOpenOnEnter('c', 'C')
    expect(resolveProfileTabNavigationAfterClose('b')).toBe('c')
    expect(resolveProfileTabNavigationAfterClose('c')).toBe('b')
  })

  it('recordScriptureModalTab stores compare and chapter view per tab', () => {
    recordScriptureModalTab({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'John 3:16',
      sectionId: 's1',
      subsectionId: 's1-0',
      translation: 'esv',
      chapterView: true,
      compareTranslation: 'nasb',
    })
    recordScriptureModalTab({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'Romans 8:1',
      sectionId: 's2',
      subsectionId: 's2-0',
      translation: 'esv',
      chapterView: false,
      compareTranslation: null,
    })
    const john = getScriptureModalTabEntry('default', 'John 3:16')
    const romans = getScriptureModalTabEntry('default', 'Romans 8:1')
    expect(john?.chapterView).toBe(true)
    expect(john?.compareTranslation).toBe('nasb')
    expect(romans?.chapterView).toBeUndefined()
    expect(romans?.compareTranslation).toBeUndefined()
  })

  it('recordScriptureModalTab preserves compareTranslation when update omits compareTranslation', () => {
    recordScriptureModalTab({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'John 3:16',
      sectionId: 's1',
      subsectionId: 's1-0',
      translation: 'esv',
      compareTranslation: 'nasb',
    })
    recordScriptureModalTab({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'John 3:16',
      sectionId: 's1',
      subsectionId: 's1-0',
      translation: 'kjv',
    })
    expect(getScriptureModalTabEntry('default', 'John 3:16')?.compareTranslation).toBe('nasb')
    expect(getScriptureModalTabEntry('default', 'John 3:16')?.translation).toBe('kjv')
  })

  it('recordScriptureModalTab clears compareTranslation when compareTranslation is null', () => {
    recordScriptureModalTab({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'John 3:16',
      sectionId: 's1',
      subsectionId: 's1-0',
      compareTranslation: 'nasb',
    })
    recordScriptureModalTab({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'John 3:16',
      sectionId: 's1',
      subsectionId: 's1-0',
      compareTranslation: null,
    })
    expect(getScriptureModalTabEntry('default', 'John 3:16')?.compareTranslation).toBeUndefined()
  })

  it('recordScriptureModalTab preserves chapterView when update omits chapterView', () => {
    recordScriptureModalTab({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'John 3:16',
      sectionId: 's1',
      subsectionId: 's1-0',
      translation: 'esv',
      chapterView: true,
    })
    recordScriptureModalTab({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'John 3:16',
      sectionId: 's1',
      subsectionId: 's1-0',
      translation: 'kjv',
    })
    expect(getScriptureModalTabEntry('default', 'John 3:16')?.chapterView).toBe(true)
    expect(getScriptureModalTabEntry('default', 'John 3:16')?.translation).toBe('kjv')
  })

  it('recordScriptureModalTab clears chapterView when chapterView is false', () => {
    recordScriptureModalTab({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'John 3:16',
      sectionId: 's1',
      subsectionId: 's1-0',
      chapterView: true,
    })
    recordScriptureModalTab({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'John 3:16',
      sectionId: 's1',
      subsectionId: 's1-0',
      chapterView: false,
    })
    expect(getScriptureModalTabEntry('default', 'John 3:16')?.chapterView).toBeUndefined()
  })

  it('recordScriptureModalTab stores translation per tab', () => {
    recordScriptureModalTab({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'John 3:16',
      sectionId: 's1',
      subsectionId: 's1-0',
      translation: 'kjv',
    })
    recordScriptureModalTab({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'Romans 8:1',
      sectionId: 's2',
      subsectionId: 's2-0',
      translation: 'nasb',
    })
    const tabs = loadScriptureModalTabs()
    expect(tabs.find((t) => t.reference === 'John 3:16')?.translation).toBe('kjv')
    expect(tabs.find((t) => t.reference === 'Romans 8:1')?.translation).toBe('nasb')
    expect(buildProfileRecentScriptureHref(tabs[0]!)).toContain('translation=kjv')
  })

  it('recordScriptureModalTab updates scriptureTabs without changing Last Open scriptures', () => {
    recordScriptureModalTab({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'John 3:16',
      sectionId: 's1',
      subsectionId: 's1-0',
      translation: 'esv',
    })
    recordScriptureModalTab({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'Romans 8:1',
      sectionId: 's2',
      subsectionId: 's2-0',
    })
    recordScriptureLastOpen({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'John 3:16',
      sectionId: 's1',
      subsectionId: 's1-0',
    })
    recordScriptureLastOpen({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'Romans 8:1',
      sectionId: 's2',
      subsectionId: 's2-0',
    })
    recordScriptureModalTab({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'Galatians 2:16',
      sectionId: 's3',
      subsectionId: 's3-0',
    })
    expect(loadProfileRecentScriptures().map((s) => s.reference)).toEqual(['Romans 8:1', 'John 3:16'])
    expect(loadScriptureModalTabs().map((s) => s.reference)).toEqual([
      'John 3:16',
      'Romans 8:1',
      'Galatians 2:16',
    ])
  })

  it('removeScriptureModalTab removes passage from tabs only and preserves Last Open scriptures', () => {
    recordScriptureLastOpen({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'John 3:16',
      sectionId: 's1',
      subsectionId: 's1-0',
    })
    recordScriptureModalTab({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'Romans 8:1',
      sectionId: 's2',
      subsectionId: 's2-0',
    })
    removeScriptureModalTab('default', 'John 3:16')
    expect(loadProfileRecentScriptures().map((s) => s.reference)).toEqual(['John 3:16'])
    expect(loadScriptureModalTabs().map((s) => s.reference)).toEqual(['Romans 8:1'])
  })

  it('resolveScriptureTabNavigationAfterClose prefers tab to the right', () => {
    recordScriptureModalTab({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'Romans 1:1',
      sectionId: 'a',
      subsectionId: 'a-0',
    })
    recordScriptureModalTab({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'Romans 1:2',
      sectionId: 'b',
      subsectionId: 'b-0',
    })
    recordScriptureModalTab({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'Romans 1:3',
      sectionId: 'c',
      subsectionId: 'c-0',
    })
    expect(resolveScriptureTabNavigationAfterClose('default', 'Romans 1:2')?.reference).toBe('Romans 1:3')
    expect(scriptureModalTabKey(resolveScriptureTabNavigationAfterClose('default', 'Romans 1:3')!)).toBe(
      scriptureModalTabKey({ slug: 'default', reference: 'Romans 1:2' })
    )
  })

  it('removeProfileResourceTab removes slug from tabs only and preserves MRU resources and scriptures', () => {
    recordScriptureLastOpen({
      slug: 'default',
      profileTitle: 'Gospel',
      reference: 'John 3:16',
      sectionId: 'section-1',
      subsectionId: 'section-1-0',
    })
    recordProfileLastOpenOnEnter('a', 'A')
    recordProfileLastOpenOnEnter('b', 'B')
    removeProfileResourceTab('a')
    expect(loadProfileRecentResources().map((r) => r.slug)).toEqual(['b', 'a'])
    expect(loadProfileRecentResourcesForTabs().map((r) => r.slug)).toEqual(['b'])
    expect(loadProfileRecentScriptures()[0]?.reference).toBe('John 3:16')
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
