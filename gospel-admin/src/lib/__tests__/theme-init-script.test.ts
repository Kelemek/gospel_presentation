import { getThemeInitScriptContent, THEME_STORAGE_KEY } from '@/lib/theme-init-script'

describe('theme-init-script', () => {
  it('emits blocking init script for localStorage and system preference', () => {
    const script = getThemeInitScriptContent()
    expect(script).toContain(THEME_STORAGE_KEY)
    expect(script).toContain('localStorage.getItem')
    expect(script).toContain('prefers-color-scheme: dark')
    expect(script).toContain('document.documentElement.classList.toggle')
  })
})
