'use client'

import { useServerInsertedHTML } from 'next/navigation'

type KindleReadInlineScriptProps = {
  scriptId: string
  scriptContent: string
}

/**
 * Inline Kindle scripts injected in the SSR stream only (returns null on the client).
 * Avoids React 19 script-in-tree warnings and hydration mismatches on read routes.
 */
export default function KindleReadInlineScript({
  scriptId,
  scriptContent,
}: KindleReadInlineScriptProps) {
  useServerInsertedHTML(() => (
    <script
      id={scriptId}
      dangerouslySetInnerHTML={{
        __html: scriptContent,
      }}
    />
  ))

  return null
}
