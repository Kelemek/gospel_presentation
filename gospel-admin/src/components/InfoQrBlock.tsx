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
    <div className={`flex flex-col items-center text-center ${className}`}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg border border-gray-200 bg-white p-1.5 shadow-sm transition-opacity hover:opacity-90 dark:border-slate-600 dark:bg-slate-900 print:border-gray-300 xl:p-2"
        aria-label={`${label}: open link`}
      >
        <span className="inline-block shrink-0 [&_svg]:h-22 [&_svg]:w-22 [&_svg]:max-w-full xl:[&_svg]:h-[128px] xl:[&_svg]:w-[128px]">
          <QRCodeSVG value={href} size={size} level="M" />
        </span>
      </a>
      <p className="mt-1.5 text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100 xl:mt-2 xl:text-sm">
        {label}
      </p>
      {showShortUrl ? (
        <p className="mt-0.5 max-w-56 wrap-break-word text-xs text-slate-600 dark:text-slate-400">{shortUrl}</p>
      ) : null}
    </div>
  )
}
