import { buildProfileContentLayoutProps } from '@/lib/buildProfileContentLayoutProps'
import { makeProfileContentHooksSlice } from '@/lib/testFixtures/profileContentHooksSlice'

describe('buildProfileContentLayoutProps', () => {
  it('omits slideout when menu is closed', () => {
    const layout = buildProfileContentLayoutProps(makeProfileContentHooksSlice({ isMenuOpen: false }))
    expect(layout.slideout).toBeNull()
    expect(layout.header.profileSlug).toBe('default')
  })

  it('includes slideout when menu is open with study menu callbacks', () => {
    const hooks = makeProfileContentHooksSlice({ isMenuOpen: true })
    const layout = buildProfileContentLayoutProps(hooks)

    expect(layout.slideout?.profileInfo.slug).toBe('default')
    expect(layout.slideout?.onOpenBibleReader).toBe(hooks.studyModals.handleOpenBibleReader)
    expect(layout.slideout?.onOpenStudyLibrary).toBe(hooks.studyModals.openStudyLibrary)
    expect(layout.header.scriptureModalOpen).toBe(hooks.scriptureModal.activeScripture.isOpen)
  })
})
