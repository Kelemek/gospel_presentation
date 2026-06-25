import '@/app/read/kindle.css'
import KindleReadLastCardStorageScript from '@/components/KindleReadLastCardStorageScript'
import KindleReadTextSizePreference from '@/components/KindleReadTextSizePreference'
import KindleReadTextSizeStorageScript from '@/components/KindleReadTextSizeStorageScript'
import KindleReadTranslationStorageScript from '@/components/KindleReadTranslationStorageScript'
import KindleReadVersePinClient from '@/components/KindleReadVersePinClient'

export default function KindleScriptureReadLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="kindle-read-root kindle-read-scripture-page">
      <KindleReadTextSizeStorageScript />
      <KindleReadTranslationStorageScript />
      <KindleReadTextSizePreference />
      <KindleReadLastCardStorageScript />
      <KindleReadVersePinClient />
      {children}
    </div>
  )
}
