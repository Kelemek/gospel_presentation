/** Must match `gospel-profile-theme` in ThemeContext / ApplyTheme. */
export const THEME_STORAGE_KEY = 'gospel-profile-theme'

/**
 * Blocking inline script for `<head>`: reads localStorage (explicit theme) or system
 * preference and toggles `dark` / `data-theme` on `<html>` / `<body>` before first paint.
 * On /admin routes, forces light document chrome (admin stays light-only).
 */
export function getThemeInitScriptContent(): string {
  const key = JSON.stringify(THEME_STORAGE_KEY)
  return `(function(){var key=${key};var path=typeof location!=='undefined'?location.pathname:'';var isAdmin=path==='/admin'||path.indexOf('/admin/')===0;if(isAdmin){document.documentElement.classList.remove('dark');document.documentElement.removeAttribute('data-theme');if(document.body)document.body.classList.remove('dark');return;}var raw=typeof localStorage!=='undefined'?localStorage.getItem(key):null;var stored=(raw==='light'||raw==='dark'||raw==='black')?raw:null;var theme=stored||(typeof window!=='undefined'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var isDark=theme==='dark'||theme==='black';document.documentElement.classList.toggle('dark',isDark);if(document.body)document.body.classList.toggle('dark',isDark);if(theme==='black'){document.documentElement.setAttribute('data-theme','black');}else{document.documentElement.removeAttribute('data-theme');}})();`
}
