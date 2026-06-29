import '@/app/read/kindle.css'
import KindleReadHashScrollScript from '@/components/KindleReadHashScrollScript'
import KindleReadMenuCollapse from '@/components/KindleReadMenuCollapse'
import KindleReadMenuModeScript from '@/components/KindleReadMenuModeScript'
import KindleReadPinHighlightsScript from '@/components/KindleReadPinHighlightsScript'
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
      <KindleReadMenuModeScript />
      <KindleReadHashScrollScript />
      <KindleReadPinHighlightsScript />
      <KindleReadTextSizePreference />
      <KindleReadTranslationPreference />
      <KindleReadVersePinClient />
      <KindleReadMenuCollapse />
      {children}
    </div>
  )
}
