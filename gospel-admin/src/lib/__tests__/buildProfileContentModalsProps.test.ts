import { buildProfileContentModalsProps } from '@/lib/buildProfileContentModalsProps'
import { makeProfileContentHooksSlice } from '@/lib/testFixtures/profileContentHooksSlice'

describe('buildProfileContentModalsProps', () => {
  it('groups scripture and study modal props', () => {
    const modals = buildProfileContentModalsProps(makeProfileContentHooksSlice())
    expect(modals.scripture.activeScripture.reference).toBe('Romans 8:1')
    expect(modals.study.bibleReader.isOpen).toBe(true)
  })

  it('opens scripture from bible reader confirm', () => {
    const hooks = makeProfileContentHooksSlice()
    const modals = buildProfileContentModalsProps(hooks)

    modals.study.bibleReader.onConfirm('John 1:1', { initialChapterView: true })

    expect(hooks.scriptureModal.handleScriptureClick).toHaveBeenCalledWith(
      'John 1:1',
      undefined,
      undefined,
      { initialChapterView: true, pickerNavigation: true }
    )
    expect(hooks.studyModals.closeBibleReader).toHaveBeenCalled()
  })
})
