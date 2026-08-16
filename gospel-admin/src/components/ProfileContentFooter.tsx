'use client'

import Link from 'next/link'
import { ScriptureFooterAttributionParagraphs } from '@/components/ScriptureFooterAttributionParagraphs'

export type ProfileContentFooterProps = {
  enabledTranslationCodes: string[] | null
}

export default function ProfileContentFooter({ enabledTranslationCodes }: ProfileContentFooterProps) {
  return (
    <footer className="bg-slate-700 dark:bg-slate-900 text-white py-10 mt-16 print-hide">
      <div className="container mx-auto px-5 max-w-3xl">
        <div className="space-y-4 text-sm opacity-90 leading-relaxed text-center md:text-left">
          <ScriptureFooterAttributionParagraphs
            anchorClassName="text-blue-400 hover:text-blue-300 underline"
            enabledTranslationCodes={enabledTranslationCodes}
          />
        </div>
        <div className="mt-8 pt-6 border-t border-slate-600 flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Link href="/info" className="text-blue-400 hover:text-blue-300 underline">
            App Info & QR Codes
          </Link>
          <Link href="/copyright" className="text-blue-400 hover:text-blue-300 underline">
            Copyright & Attribution
          </Link>
          <Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  )
}
