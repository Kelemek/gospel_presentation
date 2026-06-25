import '@/app/read/kindle.css'
import KindleReadMenuCollapse from '@/components/KindleReadMenuCollapse'
import KindleReadTextSizePreference from '@/components/KindleReadTextSizePreference'
import KindleReadTextSizeStorageScript from '@/components/KindleReadTextSizeStorageScript'
import KindleReadTranslationPreference from '@/components/KindleReadTranslationPreference'
import KindleReadTranslationStorageScript from '@/components/KindleReadTranslationStorageScript'
import KindleReadVersePinClient from '@/components/KindleReadVersePinClient'

export default function KindleReadSegmentLayout({
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
      <KindleReadVersePinClient />
      <KindleReadMenuCollapse />
      {children}
    </div>
  )
}
