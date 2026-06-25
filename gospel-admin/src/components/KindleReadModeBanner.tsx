import { kindleProfileReadUrl } from '@/lib/kindleReadHtml'

type KindleReadModeBannerProps = {
  slug: string
}

/** Shown on the main profile route when the request looks like a Kindle browser. */
export default function KindleReadModeBanner({ slug }: KindleReadModeBannerProps) {
  const readUrl = kindleProfileReadUrl(slug)
  return (
    <div
      className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-4 py-3 text-center text-sm text-amber-950 dark:text-amber-100"
      role="status"
    >
      <p>
        Reading on a Kindle or basic e-reader browser?{' '}
        <a
          href={readUrl}
          className="font-semibold underline text-amber-900 dark:text-amber-50"
        >
          Open the Kindle-friendly read view
        </a>{' '}
        (no app features required).
      </p>
    </div>
  )
}
