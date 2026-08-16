/**
 * Shared Jest mocks for ProfileContent integration tests.
 * Import this module before ProfileContent in test files:
 *   import '@/lib/testing/profileContentTestMocks'
 */

import '@/lib/testing/profileContentComponentTestMocks'

jest.mock('@/components/TableOfContents', () => ({ __esModule: true, default: () => null }))

jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: null } }),
    },
  }),
}))

export {
  installProfileContentFetchMock,
  profileContentTestProfileInfo,
  profileContentTestSections,
  type ProfileContentFetchMockOptions,
} from '@/lib/testing/profileContentFetchTestMock'
