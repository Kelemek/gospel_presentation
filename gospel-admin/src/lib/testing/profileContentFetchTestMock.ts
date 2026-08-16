export type ProfileContentFetchMockOptions = {
  scriptureText?: string
  spurgeonLinks?: unknown
}

export const profileContentTestProfileInfo = {
  title: 'Profile',
  slug: 'p1',
  favoriteScriptures: [] as string[],
}

export const profileContentTestSections = [
  {
    section: 1,
    title: 'Section 1',
    subsections: [
      {
        title: 'Sub 1',
        content: '<p>Some content</p>',
        scriptureReferences: [{ reference: 'John 3:16', favorite: false }],
      },
    ],
  },
]

export function installProfileContentFetchMock(options: ProfileContentFetchMockOptions = {}) {
  const scriptureText = options.scriptureText ?? '[1] Scripture text.'
  const spurgeonLinks = options.spurgeonLinks ?? { items: [] }

  ;(global as unknown as { fetch: typeof fetch }).fetch = jest.fn(
    (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : String(input)
      if (url.includes('/visit')) {
        return Promise.resolve({ ok: true, json: async () => ({}) }) as unknown as Response
      }
      if (url.includes('/api/scripture/spurgeon-links')) {
        return Promise.resolve({
          ok: true,
          json: async () => spurgeonLinks,
        }) as unknown as Response
      }
      if (url.includes('/api/scripture')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ text: scriptureText }),
        }) as unknown as Response
      }
      return Promise.resolve({ ok: true, json: async () => ({}) }) as unknown as Response
    }
  ) as unknown as typeof fetch
}
