import {
  KINDLE_READ_ROOT_MENU_OPEN_CLASS,
  kindleReadMenuModeScriptContent,
} from '../kindleReadMenuModeScript'

describe('kindleReadMenuModeScript', () => {
  it('emits inline script for profile read menu mode', () => {
    const script = kindleReadMenuModeScriptContent()
    expect(script).toContain('.kindle-read-menu-trigger-btn')
    expect(script).toContain(KINDLE_READ_ROOT_MENU_OPEN_CLASS)
    expect(script).toContain("addEventListener('click',onTrigger")
  })
})
