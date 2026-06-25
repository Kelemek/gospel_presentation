import { getEnabledTranslationCodes } from '@/lib/enabledTranslationCodes'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

describe('getEnabledTranslationCodes', () => {
  beforeEach(() => {
    jest.mocked(createClient).mockReset()
  })

  it('returns enabled codes with ESV first when missing from settings', async () => {
    jest.mocked(createClient).mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: async () => ({
              data: [
                { translation_code: 'kjv', translation_name: 'KJV (King James Version)', display_order: 1 },
                { translation_code: 'nasb', translation_name: 'NASB', display_order: 2 },
              ],
              error: null,
            }),
          }),
        }),
      }),
    } as never)

    await expect(getEnabledTranslationCodes()).resolves.toEqual(['esv', 'kjv', 'nasb'])
  })

  it('falls back to ESV when the query fails', async () => {
    jest.mocked(createClient).mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: async () => ({ data: null, error: new Error('fail') }),
          }),
        }),
      }),
    } as never)

    await expect(getEnabledTranslationCodes()).resolves.toEqual(['esv'])
  })
})
