import { kindleReadLastCardStorageScriptContent } from '@/lib/kindleReadLastCardStorage'

/** Runs before React on Kindle scripture pages so card progress saves to localStorage. */
export default function KindleReadLastCardStorageScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: kindleReadLastCardStorageScriptContent(),
      }}
    />
  )
}
