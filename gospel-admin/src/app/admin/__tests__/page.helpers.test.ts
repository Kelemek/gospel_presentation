import { generateSlug, createProfilePayload, isProfileSlugTakenError, isUniqueConstraintError } from '../profileCreateHelpers'

describe('admin page helpers', () => {
  describe('generateSlug', () => {
    test('generates slug from title and lowercases/strips chars', () => {
      expect(generateSlug('My Profile!')).toBe('myprofile')
      expect(generateSlug('  ')).toBe('profile')
    })

    test('truncates to 15 chars', () => {
      const long = 'This Is A Very Long Profile Title'
      const slug = generateSlug(long)
      expect(slug.length).toBeLessThanOrEqual(15)
    })
  })

  describe('createProfilePayload', () => {
    test('trims fields and sets defaults', () => {
      const form = {
        title: '  Title  ',
        description: ' desc ',
        cloneFromSlug: '',
        isTemplate: true,
      }

      const payload = createProfilePayload(form)
      expect(payload.title).toBe('Title')
      expect(payload.description).toBe('desc')
      expect(payload.cloneFromSlug).toBe('default')
      expect(payload.isTemplate).toBe(true)
    })

    test('includes slug when provided', () => {
      const payload = createProfilePayload({
        slug: '  MySlug  ',
        title: 'T',
        cloneFromSlug: 'default',
        isTemplate: true,
      })
      expect(payload).toMatchObject({
        slug: 'myslug',
        title: 'T',
        cloneFromSlug: 'default',
        isTemplate: true,
      })
    })

    test('omits slug when empty', () => {
      const payload = createProfilePayload({
        slug: '   ',
        title: 'T',
        isTemplate: false,
      })
      expect('slug' in payload).toBe(false)
    })

    test('blank presentation omits cloneFromSlug', () => {
      const payload = createProfilePayload({
        title: '  T  ',
        isTemplate: true,
        blankGospelData: true,
      })
      expect(payload).toMatchObject({
        title: 'T',
        isTemplate: true,
        blankGospelData: true,
      })
      expect('cloneFromSlug' in payload).toBe(false)
    })
  })

  describe('isProfileSlugTakenError', () => {
    test('detects createProfile duplicate message', () => {
      expect(isProfileSlugTakenError("Profile with slug 'foo' already exists")).toBe(true)
    })

    test('detects Postgres-style unique errors via isUniqueConstraintError', () => {
      expect(isProfileSlugTakenError('duplicate key value violates unique constraint')).toBe(true)
    })

    test('detects API JSON shape', () => {
      expect(isProfileSlugTakenError({ error: "Profile with slug 'x' already exists" })).toBe(true)
    })

    test('returns false for unrelated errors', () => {
      expect(isProfileSlugTakenError('Source profile not found')).toBe(false)
    })
  })

  describe('isUniqueConstraintError', () => {
    test('detects string messages', () => {
      expect(isUniqueConstraintError('duplicate key value violates unique constraint')).toBe(true)
      expect(isUniqueConstraintError('some other error')).toBe(false)
    })

    test('detects object shapes with error or message', () => {
      expect(isUniqueConstraintError({ error: 'profiles_slug_key violation' })).toBe(true)
      expect(isUniqueConstraintError({ message: 'unique constraint failed' })).toBe(true)
      expect(isUniqueConstraintError({ something: 'else' })).toBe(false)
    })
  })
})
