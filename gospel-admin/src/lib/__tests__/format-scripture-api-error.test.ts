import { formatScriptureApiError } from '@/lib/format-scripture-api-error'

describe('formatScriptureApiError', () => {
  it('returns details when error is the generic fetch message', () => {
    expect(
      formatScriptureApiError({
        error: 'Failed to fetch scripture text',
        details: 'ESV API error: 502',
      })
    ).toBe('ESV API error: 502')
  })

  it('returns details for database wrapper', () => {
    expect(
      formatScriptureApiError({
        error: 'Database error occurred',
        details: 'Database error: timeout',
      })
    ).toBe('Database error: timeout')
  })

  it('returns error alone when no details', () => {
    expect(formatScriptureApiError({ error: 'API.Bible Bible ID not configured (API_BIBLE_BIBLE_ID_NIV)' })).toBe(
      'API.Bible Bible ID not configured (API_BIBLE_BIBLE_ID_NIV)'
    )
  })

  it('joins error and details for other pairs', () => {
    expect(
      formatScriptureApiError({
        error: 'Something went wrong',
        details: 'extra',
      })
    ).toBe('Something went wrong: extra')
  })
})
