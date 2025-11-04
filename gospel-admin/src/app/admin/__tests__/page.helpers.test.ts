import { generateSlug, createProfilePayload, isUniqueConstraintError } from '../page'

describe('admin page helpers', () => {
  describe('generateSlug', () => {
    test('generates a simple slug', () => {
      expect(generateSlug('Hello World')).toBe('helloworld')
    })

    test('removes punctuation and truncates', () => {
      const long = 'This is a Very Long Title!!! With punctuation.'
      const slug = generateSlug(long)
      expect(slug).toMatch(/^[a-z0-9]{1,15}$/)
      expect(slug.length).toBeLessThanOrEqual(15)
    })

    test('falls back to profile when empty', () => {
      expect(generateSlug('')).toBe('profile')
    })
  })

  describe('createProfilePayload', () => {
    const baseForm = {
      title: '  My Title  ',
      description: '  desc  ',
      cloneFromSlug: undefined,
      isTemplate: true,
      counseleeEmails: ['A@EXAMPLE.COM', '   ', 'b@example.com']
    }

    test('builds payload for admin (keeps template flag)', () => {
      const payload = createProfilePayload(baseForm as any, 'admin')
      expect(payload.title).toBe('My Title')
      expect(payload.description).toBe('desc')
      expect(payload.cloneFromSlug).toBe('default')
      expect(payload.isTemplate).toBe(true)
      expect(payload.counseleeEmails).toEqual(['A@EXAMPLE.COM', 'b@example.com'])
    })

    test('builds payload for counselor (isTemplate forced false)', () => {
      const payload = createProfilePayload(baseForm as any, 'counselor')
      expect(payload.isTemplate).toBe(false)
    })
  })

  describe('isUniqueConstraintError', () => {
    test('detects various error messages', () => {
      expect(isUniqueConstraintError('duplicate key value violates unique constraint')).toBe(true)
      expect(isUniqueConstraintError({ error: 'profiles_slug_key' })).toBe(true)
      expect(isUniqueConstraintError({ message: 'some unique constraint failed' })).toBe(true)
      expect(isUniqueConstraintError('some unrelated error')).toBe(false)
      expect(isUniqueConstraintError({})).toBe(false)
    })
  })
})
