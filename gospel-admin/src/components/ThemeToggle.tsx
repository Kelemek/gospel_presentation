'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { nextTheme } from '@/lib/profileTheme'

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
    </svg>
  )
}

function BlackModeIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}

function switchLabelForCurrent(theme: 'light' | 'dark' | 'black'): string {
  switch (theme) {
    case 'light':
      return 'Switch to dark mode'
    case 'dark':
      return 'Switch to black mode'
    case 'black':
      return 'Switch to light mode'
    default:
      return 'Switch appearance'
  }
}

function IconForCurrent(theme: 'light' | 'dark' | 'black', className: string) {
  switch (theme) {
    case 'light':
      return <MoonIcon className={className} />
    case 'dark':
      return <BlackModeIcon className={className} />
    case 'black':
      return <SunIcon className={className} />
    default:
      return <MoonIcon className={className} />
  }
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const label = switchLabelForCurrent(theme)

  return (
    <button
      type="button"
      data-tour="theme-toggle"
      onClick={() => setTheme(nextTheme(theme))}
      className="p-2 rounded-md flex items-center justify-center min-h-[36px] min-w-[36px] bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 dark:active:bg-slate-800 dark:text-white transition-colors cursor-pointer"
      aria-label={label}
      title={label}
    >
      {IconForCurrent(theme, 'w-5 h-5')}
    </button>
  )
}
