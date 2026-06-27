import KindleReadBluePinButtonScript from '@/components/KindleReadBluePinButtonScript'
import KindleReadLastCardStorageScript from '@/components/KindleReadLastCardStorageScript'
import KindleReadVersePinClient from '@/components/KindleReadVersePinClient'

/** Scripture read route only — card progress scripts (not used on library index pages). */
export default function KindleScriptureReadSegmentLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="kindle-read-scripture-page">
      <KindleReadLastCardStorageScript />
      <KindleReadVersePinClient />
      {children}
      <KindleReadBluePinButtonScript />
    </div>
  )
}
