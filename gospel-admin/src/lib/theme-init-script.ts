/** Must match `gospel-profile-theme` in ThemeContext / ApplyTheme. */
export const THEME_STORAGE_KEY = 'gospel-profile-theme'

/**
 * Blocking inline script for `<head>`: reads localStorage (explicit theme) or system
 * preference and toggles `dark` on `<html>` / `<body>` before first paint.
 */
export function getThemeInitScriptContent(): string {
  const key = JSON.stringify(THEME_STORAGE_KEY)
  return `(function(){var key=${key};var stored=typeof localStorage!=='undefined'&&(localStorage.getItem(key)==='light'||localStorage.getItem(key)==='dark')?localStorage.getItem(key):null;var theme=stored||(typeof window!=='undefined'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var isDark=theme==='dark';document.documentElement.classList.toggle('dark',isDark);if(document.body)document.body.classList.toggle('dark',isDark);})();`
}
