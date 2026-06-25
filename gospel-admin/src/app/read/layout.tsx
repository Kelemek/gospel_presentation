import '@/app/read/kindle.css'
import KindleReadTextSizePreference from '@/components/KindleReadTextSizePreference'
import KindleReadTextSizeStorageScript from '@/components/KindleReadTextSizeStorageScript'
import KindleReadTranslationPreference from '@/components/KindleReadTranslationPreference'
import KindleReadTranslationStorageScript from '@/components/KindleReadTranslationStorageScript'

/** Shared Kindle read shell for `/read/libraries/*` and other non-scripture read routes. */
export default function KindleReadLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="kindle-read-root">
      <KindleReadTextSizeStorageScript />
      <KindleReadTranslationStorageScript />
      <KindleReadTextSizePreference />
      <KindleReadTranslationPreference />
      {children}
    </div>
  )
}
