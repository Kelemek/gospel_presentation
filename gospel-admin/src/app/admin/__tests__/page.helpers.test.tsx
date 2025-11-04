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
    test('trims fields and sets defaults for admin role', () => {
      const form = {
        title: '  Title  ',
        description: ' desc ',
        cloneFromSlug: '',
        isTemplate: true,
        counseleeEmails: [' alice@example.com ', '']
      }

      const payload = createProfilePayload(form as any, 'admin')
      expect(payload.title).toBe('Title')
      expect(payload.description).toBe('desc')
      // empty cloneFromSlug becomes default
      expect(payload.cloneFromSlug).toBe('default')
      // admin may set isTemplate
      expect(payload.isTemplate).toBe(true)
      // counseleeEmails filters out empty entries but preserves original values
      expect(payload.counseleeEmails).toEqual([' alice@example.com '])
    })

    test('non-admin cannot set isTemplate', () => {
      const form = { title: 't', isTemplate: true, counseleeEmails: [] }
      const payload = createProfilePayload(form as any, 'counselor')
      expect(payload.isTemplate).toBe(false)
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
