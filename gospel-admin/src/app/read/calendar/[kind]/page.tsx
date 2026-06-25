import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import KindleReadFooter from '@/components/KindleReadFooter'
import { getEnabledTranslationCodes } from '@/lib/enabledTranslationCodes'
import {
  isKindleReadCalendarKind,
  kindleReadCalendarTitle,
  kindleReadCalendarUrl,
  renderKindleReadCalendarHtml,
} from '@/lib/kindleReadCalendar'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface KindleCalendarPageProps {
  params: Promise<{ kind: string }>
  searchParams: Promise<{ month?: string; from?: string }>
}

export async function generateMetadata({ params }: KindleCalendarPageProps): Promise<Metadata> {
  const { kind } = await params
  if (!isKindleReadCalendarKind(kind)) {
    return { title: 'Calendar not found' }
  }
  return {
    title: `${kindleReadCalendarTitle(kind)} (Kindle read)`,
  }
}

export default async function KindleCalendarPage({ params, searchParams }: KindleCalendarPageProps) {
  const { kind: kindParam } = await params
  if (!isKindleReadCalendarKind(kindParam)) {
    notFound()
  }

  const { month: monthParam, from } = await searchParams
  const fromSlug = from?.trim() || undefined
  const now = new Date()
  const parsedMonth = Number.parseInt(monthParam || String(now.getMonth() + 1), 10)
  const month =
    Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
      ? parsedMonth
      : now.getMonth() + 1

  const html = renderKindleReadCalendarHtml({
    kind: kindParam,
    month,
    fromSlug,
    now,
  })
  const enabledTranslationCodes = await getEnabledTranslationCodes()
  const fullSiteUrl = fromSlug ? `/${encodeURIComponent(fromSlug)}/` : '/default/'
  const refreshHref = kindleReadCalendarUrl(kindParam, month, fromSlug)

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <main className="kindle-read-main">
        <KindleReadFooter
          enabledTranslationCodes={enabledTranslationCodes}
          fullSiteUrl={fullSiteUrl}
          refreshHref={refreshHref}
        />
      </main>
    </>
  )
}
