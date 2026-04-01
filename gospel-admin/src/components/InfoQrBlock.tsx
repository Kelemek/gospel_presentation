'use client'

import { QRCodeSVG } from 'qrcode.react'

type InfoQrBlockProps = {
  href: string
  label: string
  shortUrl: string
  size: number
  className?: string
  showShortUrl?: boolean
}

export function InfoQrBlock({
  href,
  label,
  shortUrl,
  size,
  className = '',
  showShortUrl = true,
}: InfoQrBlockProps) {
  return (
    <div className={`flex flex-col items-center justify-center w-full h-full min-h-0 ${className}`}>
      <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center aspect-square w-full max-w-[100px] xl:w-auto xl:h-full xl:max-w-full xl:max-h-full rounded-xl border border-gray-200 bg-white p-2 shadow-md transition-transform hover:scale-[1.02] dark:border-slate-600 dark:bg-slate-800 print:border-gray-300 xl:p-3 xl:rounded-2xl xl:shadow-lg"
          aria-label={`${label}: open link`}
        >
          <QRCodeSVG value={href} size={size} level="M" style={{ width: '100%', height: '100%' }} />
        </a>
      </div>
      <div className="shrink-0 flex flex-col items-center mt-2 xl:mt-2 2xl:mt-3">
        <p className="shrink-0 text-xs font-bold leading-tight text-slate-800 dark:text-slate-100 xl:text-lg 2xl:text-xl xl:tracking-tight">
          {label}
        </p>
        {showShortUrl ? (
          <p className="mt-0.5 max-w-56 wrap-break-word text-[10px] xl:text-xs 2xl:text-sm text-slate-600 dark:text-slate-400">
            {shortUrl}
          </p>
        ) : null}
      </div>
    </div>
  )
}
