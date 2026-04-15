'use client'

import { InfoQrBlock } from '@/components/InfoQrBlock'
import { InfoSheetScaleFit } from '@/components/InfoSheetScaleFit'
import { INFO_PAGE_LINKS } from '@/lib/info-page-links'
import { useApplyPageThemeToDocument, usePageTheme } from '@/lib/usePageTheme'

const APP_FEATURES = [
  'Read scriptures in their full biblical context',
  'Compare translations (ESV, KJV, NASB, LSB, NIV, NLT, CSB)',
  'Guided verse memorization with practice rounds',
  'Marriage seminar content by Dr. Randy Westerberg',
  'Save your answers to reflection questions',
  'Bookmarks, print layouts, and rich reading tools',
] as const

const CONTENT_SECTIONS = [
  {
    title: 'Gospel',
    items: ['The Gospel Presentation', 'The Gospel Presentation with Summaries'],
  },
  {
    title: 'Marriage',
    items: [
      'Marriage',
      'Love',
      'Needs',
      'Bitterness & Forgiveness',
      'Communication',
      'The Roles of the Husband',
      'The Roles of the Wife',
      'Physical Intimacy',
      'Reverence - A Study for Christian Wives',
    ],
  },
  {
    title: 'Biblical Counseling',
    items: [
      'Biblical Counseling Scripture Reference',
      'The 4 Rules of Communication',
      'The Conference Table',
      'Praying As A Couple',
      'The Nature Of True Repentance',
      'Personal Improvement Plan',
    ],
  },
] as const

/** Wide promo layout at Tailwind `xl` (min-width 1280px). Uses width only — not `orientation: landscape`, which stays “portrait” when the window is taller than wide. */
export default function InfoPage() {
  const theme = usePageTheme()
  useApplyPageThemeToDocument(theme)

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-4 dark:bg-gray-900 print:p-0 xl:flex xl:min-h-dvh xl:items-center xl:justify-center xl:px-6 xl:py-4">
      <main
        className={[
          'mx-auto flex w-full max-w-[5.5in] flex-col overflow-x-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800',
          /* Below `xl`: fixed 5.5in × 8.5in “sheet” (viewport-capped); content scales to fit (no inner scroll). */
          'max-xl:mx-auto max-xl:aspect-[5.5/8.5] max-xl:min-h-0 max-xl:w-[min(5.5in,calc(100vw-1.5rem),calc((100dvh-2rem)*5.5/8.5))] max-xl:max-w-none max-xl:max-h-[min(8.5in,calc(100dvh-2rem))] max-xl:overflow-hidden',
          'pb-3 max-xl:pb-0',
          `xl:aspect-video xl:h-auto xl:max-w-none xl:w-[min(96vw,1920px,calc((100dvh-2rem)*16/9))] xl:min-h-0 xl:overflow-x-hidden xl:overflow-y-hidden xl:rounded-3xl xl:border-2 xl:pb-0 xl:shadow-2xl`,
          `xl:grid xl:grid-cols-5 xl:grid-rows-[minmax(0,1fr)]`,
        ].join(' ')}
      >
        <div className="flex min-h-0 min-w-0 flex-col max-xl:min-h-0 max-xl:flex-1 max-xl:overflow-hidden xl:col-span-4 xl:h-full xl:min-h-0 xl:max-h-full xl:overflow-hidden xl:rounded-bl-3xl xl:rounded-tl-3xl">
          {/* Hero + narrow QR sit outside InfoSheetScaleFit so uniform scale does not narrow them vs `main`. */}
          <section
            className={`relative w-full shrink-0 bg-linear-to-br from-slate-700 to-slate-800 px-4 pb-5 pt-5 text-white dark:from-slate-800 dark:to-slate-900 max-xl:mb-1.5 max-xl:rounded-t-2xl max-xl:px-0 max-xl:pb-3 max-xl:pt-3 sm:max-xl:mb-2 sm:max-xl:pb-6 sm:max-xl:pt-5 xl:px-8 xl:py-5 xl:pb-5`}
          >
            <div className="pointer-events-none absolute inset-0 opacity-20 [background:radial-gradient(circle_at_top_right,rgba(148,163,184,0.85),transparent_60%)]" />
            <div
              className={`relative max-xl:px-3 sm:max-xl:px-6 text-center xl:mx-auto xl:max-w-6xl xl:text-center`}
            >
              <h1
                className={`text-[2.05rem] font-extrabold leading-none tracking-tight max-xl:text-[1.35rem] sm:max-xl:text-[1.8rem] max-xl:leading-tight xl:text-[clamp(2.65rem,4.7vw,4.45rem)] xl:leading-[1.06]`}
              >
                The Gospel <br className={`hidden xl:block`} />
                Presentation
              </h1>
              <p
                className={`mt-2 text-[0.78rem] font-medium leading-snug tracking-wide text-blue-200 opacity-90 max-xl:mt-1 max-xl:text-[0.62rem] sm:max-xl:mt-1.5 sm:max-xl:text-[0.8rem] max-xl:leading-snug xl:mt-2.5 xl:text-[clamp(1.1rem,1.65vw,1.5rem)] xl:font-semibold xl:tracking-wide xl:text-blue-100/95 xl:leading-snug`}
              >
                PRESENTING THE GOSPEL IN ITS CONTEXT <br className={`xl:hidden`} />{' '}
                <span className={`hidden xl:inline`}>—</span> DR. STUART SCOTT
              </p>
            </div>
          </section>

          <InfoSheetScaleFit>
            <section
              className={`flex min-h-0 min-w-0 flex-col gap-1.5 px-3 pt-0 pb-0 max-xl:flex-1 max-xl:min-h-min max-xl:overflow-visible max-xl:gap-2 max-xl:px-2 max-xl:pb-[15px] sm:max-xl:gap-2.5 sm:max-xl:px-3 xl:grid xl:h-full xl:min-h-0 xl:min-w-0 xl:shrink-0 xl:flex-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:grid-rows-[minmax(0,1fr)] xl:items-stretch xl:overflow-hidden xl:overflow-x-hidden xl:gap-x-6 xl:gap-y-0 xl:px-6 xl:pb-2.5 xl:pt-2.5 xl:dark:bg-slate-600/50`}
            >
            <div
              className="mb-2 min-h-0 shrink-0 rounded-xl border border-blue-100 bg-linear-to-br from-blue-50/80 to-white p-1.5 dark:border-blue-800/60 dark:from-blue-950/30 dark:to-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-800 max-xl:mb-0 max-xl:p-1.5 sm:max-xl:p-2 xl:mb-0 xl:flex xl:h-full xl:min-h-0 xl:min-w-0 xl:w-full xl:flex-col xl:overflow-hidden xl:rounded-2xl xl:border-blue-200/70 xl:px-8 xl:pb-8 xl:pt-7 xl:shadow-md xl:dark:border-blue-800/50"
              tabIndex={0}
              role="region"
              aria-label="App features list"
            >
              <h2
                className="shrink-0 text-[13px] font-bold text-slate-800 dark:text-slate-100 max-xl:text-[11px] sm:max-xl:text-[14px] xl:text-[clamp(1.65rem,2.55vw,2.2rem)] xl:font-extrabold xl:leading-[1.08] xl:tracking-tight"
              >
                App Features
              </h2>
              <ul
                className="mt-0.5 grid grid-cols-1 gap-y-1 text-[11.5px] leading-snug text-slate-700 dark:text-slate-200 max-xl:mt-1 max-xl:gap-y-1 max-xl:text-[10px] sm:max-xl:gap-y-1.5 sm:max-xl:text-[12.5px] max-xl:leading-snug xl:mt-4 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col xl:justify-between xl:gap-y-0 xl:text-[clamp(1.2rem,1.88vw,1.62rem)] xl:[&_li]:leading-[1.28]"
              >
                {APP_FEATURES.map((text) => (
                  <li key={text} className="flex items-start gap-1.5 xl:gap-3">
                    <span className="mt-[0.15em] shrink-0 text-blue-500 dark:text-blue-400 xl:mt-[0.18em]" aria-hidden="true">▸</span>
                    <span className="min-w-0">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5 max-xl:min-h-min max-xl:shrink-0 max-xl:gap-1.5 sm:max-xl:gap-2 xl:h-full xl:max-h-full xl:min-h-0 xl:gap-0 xl:overflow-hidden">
              <h2
                className="shrink-0 px-1 text-[11px] font-bold uppercase leading-none tracking-wider text-slate-500 dark:text-slate-400 max-xl:mb-0 max-xl:px-0.5 max-xl:text-[9px] sm:max-xl:text-[11px] xl:px-0 xl:text-xs xl:tracking-wide xl:text-slate-600 xl:dark:text-slate-300 xl:mb-2 2xl:text-sm 2xl:mb-3"
              >
                Included Content & Resources
              </h2>
              <div
                className="flex flex-col gap-y-1.5 max-xl:min-h-min max-xl:shrink-0 max-xl:gap-y-1.5 sm:max-xl:gap-y-2 xl:grid xl:min-h-0 xl:grid-rows-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,2fr)] xl:gap-y-2.5 xl:overflow-hidden 2xl:gap-y-4 xl:flex-1"
                role="region"
                tabIndex={0}
                aria-label="Included content and resources"
              >
                {CONTENT_SECTIONS.map((section) => (
                  <div
                    key={section.title}
                    className="flex max-xl:shrink-0 flex-col rounded-xl border border-blue-100 bg-linear-to-br from-blue-50/80 to-white p-1.5 dark:border-blue-800/60 dark:from-blue-950/30 dark:to-slate-800 max-xl:p-1.5 sm:max-xl:p-2 xl:min-h-0 xl:overflow-hidden xl:rounded-xl xl:border-blue-200/70 xl:px-3 xl:py-2 xl:shadow-sm xl:dark:border-blue-800/50"
                  >
                    <h3
                      className="shrink-0 text-[13px] font-bold text-slate-800 dark:text-slate-100 max-xl:text-[10px] sm:max-xl:text-[13px] xl:text-sm xl:leading-tight 2xl:text-base"
                    >
                      {section.title}
                    </h3>
                    <ul
                      className="mt-0.5 grid grid-cols-2 gap-x-1.5 gap-y-1 max-xl:mt-0.5 max-xl:gap-x-1 max-xl:gap-y-0.5 sm:max-xl:gap-x-1.5 sm:max-xl:gap-y-1 xl:mt-1 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col xl:justify-evenly xl:gap-y-0"
                    >
                      {section.items.map((item) => (
                        <li
                          key={item}
                          className="min-w-0 flex items-start gap-0.5 text-[11px] leading-normal text-slate-700 dark:text-slate-300 max-xl:text-[8.5px] max-xl:leading-tight sm:max-xl:text-[11px] xl:gap-1 xl:text-xs xl:leading-snug 2xl:text-sm"
                        >
                          <span className="shrink-0 text-blue-500 dark:text-blue-400">▹</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            </section>
          </InfoSheetScaleFit>

          {/* Narrow: space + tone shift so the gap isn’t invisible (main body is white). */}
          <div
            className="hidden max-xl:block h-2 w-full shrink-0 bg-slate-100/95 dark:bg-slate-800/90 sm:h-2.5"
            aria-hidden
          />

          {/* Below xl: full-width QR row (not scaled); sits under the flex-1 middle region. */}
          <aside className="w-full shrink-0 border-t border-slate-200 bg-slate-50/95 px-2 pb-2 pt-2 dark:border-slate-600 dark:bg-slate-900/50 max-xl:rounded-b-2xl max-xl:border-t-0 max-xl:px-2 max-xl:pb-2 max-xl:pt-3.5 sm:max-xl:px-3 xl:hidden sm:max-xl:py-3">
            <div className="grid w-full min-w-0 grid-cols-3 gap-1 sm:max-xl:gap-2">
              {INFO_PAGE_LINKS.map((item) => (
                <InfoQrBlock
                  key={`sheet-${item.id}`}
                  href={item.href}
                  label={item.label}
                  shortUrl={item.shortUrl}
                  size={500}
                  showShortUrl={false}
                  compact
                  className="min-h-0 min-w-0"
                />
              ))}
            </div>
          </aside>
        </div>

        <aside
          className={`hidden min-h-0 min-w-0 shrink-0 xl:col-span-1 xl:col-start-5 xl:row-start-1 xl:flex xl:h-full xl:min-h-0 xl:max-h-full xl:flex-col xl:overflow-hidden xl:rounded-br-3xl xl:rounded-tr-3xl xl:border-l-2 xl:border-slate-200 xl:bg-linear-to-b xl:from-slate-100 xl:to-slate-50 xl:px-5 xl:py-4 2xl:px-8 2xl:py-6 xl:dark:border-slate-600 xl:dark:from-slate-900/90 xl:dark:to-slate-800/90`}
        >
          <div
            className={`grid h-full min-h-0 w-full min-w-0 flex-1 grid-cols-1 grid-rows-3 gap-y-3 2xl:gap-y-5`}
          >
            {INFO_PAGE_LINKS.map((item) => (
              <InfoQrBlock
                key={item.id}
                href={item.href}
                label={item.label}
                shortUrl={item.shortUrl}
                size={500}
                showShortUrl={false}
                compact
                className={`min-h-0 min-w-0`}
              />
            ))}
          </div>
        </aside>
      </main>
    </div>
  )
}
