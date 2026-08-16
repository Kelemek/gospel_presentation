/**
 * Shared null-component mocks for ProfileContent integration tests.
 * Import before ProfileContent when a file needs custom Supabase or fetch mocks:
 *   import '@/lib/testing/profileContentComponentTestMocks'
 */

jest.mock('@/components/ThemeToggle', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/BookmarksDropdown', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/SidebarAuthNav', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/ProfileHelpMenu', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/PresentationFirstVisitWelcome', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/MemorizationPracticeSession', () => ({ __esModule: true, default: () => null }))
