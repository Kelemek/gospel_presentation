import { generateSlug, createProfilePayload, isUniqueConstraintError } from '../page'

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
