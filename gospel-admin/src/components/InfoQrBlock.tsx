'use client'

import { QRCodeSVG } from 'qrcode.react'

type InfoQrBlockProps = {
  href: string
  label: string
  shortUrl: string
  size: number
  className?: string
  showShortUrl?: boolean
  /** Smaller QR / type on narrow /info “print sheet” layout (below `xl`). */
  compact?: boolean
}

export function InfoQrBlock({
  href,
  label,
  shortUrl,
  size,
  className = '',
  showShortUrl = true,
  compact = false,
}: InfoQrBlockProps) {
  return (
    <div className={`flex min-h-0 w-full flex-col items-stretch justify-stretch ${className}`}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`group flex min-h-0 w-full flex-col items-center justify-between rounded-xl border border-slate-200 bg-white shadow-md outline-none transition-all hover:border-blue-400 hover:shadow-lg hover:ring-2 hover:ring-blue-200/90 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:bg-slate-800 dark:hover:border-blue-500 dark:hover:ring-blue-900/60 dark:focus-visible:ring-offset-slate-800 print:border-gray-300 xl:min-h-0 xl:rounded-2xl xl:p-3 xl:shadow-lg xl:ring-offset-2 cursor-pointer ${
          compact
            ? 'max-xl:h-auto max-xl:flex-none xl:flex-1 p-1 sm:max-xl:p-2 xl:p-3'
            : 'flex-1 p-2'
        }`}
        aria-label={`${label}: open link`}
      >
        <div
          className={`flex min-h-0 w-full flex-col items-center justify-center ${
            compact ? 'max-xl:flex-none xl:flex-1' : 'flex-1'
          }`}
        >
          <div
            className={`flex aspect-square w-full items-center justify-center xl:h-full xl:max-h-full xl:max-w-full xl:w-auto ${
              compact ? 'max-w-[4rem] max-xl:max-w-[3.25rem] sm:max-xl:max-w-[4rem] xl:max-w-full' : 'max-w-[100px]'
            }`}
          >
            <QRCodeSVG value={href} size={size} level="M" style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
        <div
          className={`mt-2 flex w-full shrink-0 flex-col items-center px-1 text-center xl:mt-2 2xl:mt-3 ${
            compact ? 'max-xl:mt-1 sm:max-xl:mt-1.5' : ''
          }`}
        >
          <span
            className={`font-bold leading-tight text-blue-700 underline decoration-2 underline-offset-2 transition-colors group-hover:text-blue-800 dark:text-blue-300 dark:group-hover:text-blue-200 text-xs xl:text-lg 2xl:text-xl xl:tracking-tight ${
              compact ? 'max-xl:text-[0.62rem] sm:max-xl:text-[0.8rem] max-xl:decoration-1 max-xl:underline-offset-1' : ''
            }`}
          >
            {label}
          </span>
          {showShortUrl ? (
            <span className="mt-0.5 max-w-56 wrap-break-word text-[10px] text-slate-600 dark:text-slate-400 xl:text-xs 2xl:text-sm">
              {shortUrl}
            </span>
          ) : null}
        </div>
      </a>
    </div>
  )
}
