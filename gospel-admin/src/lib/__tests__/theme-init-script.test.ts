import { getThemeInitScriptContent, THEME_STORAGE_KEY } from '@/lib/theme-init-script'

describe('theme-init-script', () => {
  it('emits blocking init script for localStorage and system preference', () => {
    const script = getThemeInitScriptContent()
    expect(script).toContain(THEME_STORAGE_KEY)
    expect(script).toContain('localStorage.getItem')
    expect(script).toContain('prefers-color-scheme: dark')
    expect(script).toContain('document.documentElement.classList.toggle')
  })

  it('supports black and blossom stored themes and data-theme attribute', () => {
    const script = getThemeInitScriptContent()
    expect(script).toContain("'black'")
    expect(script).toContain("'blossom'")
    expect(script).toContain('data-theme')
    expect(script).toContain("setAttribute('data-theme','black')")
    expect(script).toContain("setAttribute('data-theme','blossom')")
  })

  it('forces light document on admin paths', () => {
    const script = getThemeInitScriptContent()
    expect(script).toContain('/admin')
    expect(script).toContain("removeAttribute('data-theme')")
    expect(script).toContain("classList.remove('dark')")
  })
})
