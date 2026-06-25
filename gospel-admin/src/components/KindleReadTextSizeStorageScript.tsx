import { kindleReadTextSizeStorageScriptContent } from '@/lib/kindleReadTextSizePreference'

/** Runs before React on Kindle read pages so text size applies without waiting for hydration. */
export default function KindleReadTextSizeStorageScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: kindleReadTextSizeStorageScriptContent(),
      }}
    />
  )
}
