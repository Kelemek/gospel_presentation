'use client'

import { InfoQrBlock } from '@/components/InfoQrBlock'
import { INFO_PAGE_LINKS } from '@/lib/info-page-links'
import { useApplyPageThemeToDocument, usePageTheme } from '@/lib/usePageTheme'

const APP_FEATURES = [
  'Read scriptures in their full biblical context',
  'Compare translations (ESV, KJV, NASB, LSB, NIV, NLT, CSB)',
  'Marriage seminar content by Dr. Randy Westerberg',
  'Save your answers to reflection questions',
  'Bookmarks, print layouts, and rich reading tools',
] as const

const CONTENT_SECTIONS = [
  {
    title: 'Gospel',
    items: ['The Gospel Presentation', 'The Gospel Presentation with Questions'],
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
          'mx-auto w-full max-w-[5.5in] rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800',
          'flex flex-col justify-start overflow-x-hidden pb-3',
          `xl:aspect-video xl:h-auto xl:max-w-none xl:w-[min(96vw,1920px,calc((100dvh-2rem)*16/9))] xl:min-h-0 xl:overflow-x-hidden xl:overflow-y-hidden xl:rounded-3xl xl:border-2 xl:pb-0 xl:shadow-2xl`,
          `xl:grid xl:grid-cols-5 xl:grid-rows-[minmax(0,1fr)]`,
        ].join(' ')}
      >
        <div className="flex min-h-0 min-w-0 flex-col gap-y-5 xl:gap-y-0 xl:col-span-4 xl:h-full xl:min-h-0 xl:max-h-full xl:overflow-hidden xl:rounded-bl-3xl xl:rounded-tl-3xl">
          <section
            className={`relative shrink-0 bg-linear-to-br from-slate-700 to-slate-800 px-4 pb-5 pt-5 text-white dark:from-slate-800 dark:to-slate-900 xl:px-8 xl:py-5 xl:pb-5`}
          >
            <div className="pointer-events-none absolute inset-0 opacity-20 [background:radial-gradient(circle_at_top_right,rgba(148,163,184,0.85),transparent_60%)]" />
            <div
              className={`relative text-center xl:mx-auto xl:max-w-6xl xl:text-center`}
            >
              <h1
                className={`text-[2.05rem] font-extrabold leading-none tracking-tight xl:text-[clamp(2.65rem,4.7vw,4.45rem)] xl:leading-[1.06]`}
              >
                The Gospel <br className={`hidden xl:block`} />
                Presentation
              </h1>
              <p
                className={`mt-2 text-[0.78rem] font-medium leading-snug tracking-wide text-blue-200 opacity-90 xl:mt-2.5 xl:text-[clamp(1.1rem,1.65vw,1.5rem)] xl:font-semibold xl:tracking-wide xl:text-blue-100/95 xl:leading-snug`}
              >
                PRESENTING THE GOSPEL IN ITS CONTEXT <br className={`xl:hidden`} />{' '}
                <span className={`hidden xl:inline`}>—</span> DR. STUART SCOTT
              </p>
            </div>
          </section>

          <section
            className={`flex min-h-0 min-w-0 flex-col gap-1.5 px-3 pt-0 pb-0 xl:grid xl:h-full xl:min-h-0 xl:min-w-0 xl:flex-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:grid-rows-[minmax(0,1fr)] xl:items-stretch xl:overflow-hidden xl:overflow-x-hidden xl:gap-x-12 xl:gap-y-0 xl:px-6 xl:pb-2.5 xl:pt-2.5`}
          >
            <div
              className={`mb-2 min-h-0 rounded-xl border border-blue-100 bg-linear-to-b from-blue-50/80 to-white p-1.5 dark:border-blue-700/60 dark:from-blue-900/25 dark:to-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-800 xl:mb-0 xl:flex xl:h-full xl:min-h-0 xl:min-w-0 xl:w-full xl:flex-col xl:overflow-hidden xl:rounded-xl xl:border xl:px-7 xl:pb-6 xl:pt-6 xl:shadow-sm`}
              tabIndex={0}
              role="region"
              aria-label="App features list"
            >
              <h2
                className={`shrink-0 text-[13px] font-bold text-slate-800 dark:text-slate-100 xl:text-[clamp(1.65rem,2.55vw,2.2rem)] xl:leading-[1.08]`}
              >
                App Features
              </h2>
              <div
                className={`mt-0.5 min-h-0 touch-pan-y outline-none overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] xl:mt-3 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col xl:overflow-x-hidden xl:overflow-y-auto xl:pb-0`}
              >
                <ul
                  className={`grid grid-cols-1 gap-y-1 text-[11.5px] leading-snug text-slate-700 dark:text-slate-200 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col xl:justify-between xl:gap-y-0 xl:py-1 xl:text-[clamp(1.2rem,1.88vw,1.62rem)] xl:[&_li]:leading-[1.28]`}
                >
                  {APP_FEATURES.map((text) => (
                    <li key={text} className={`flex items-start gap-1.5 xl:gap-2.5`}>
                      <span className="shrink-0 font-bold text-blue-600 dark:text-blue-400">•</span>
                      <span className="min-w-0">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div
              className={`flex min-h-0 min-w-0 flex-col gap-1.5 xl:h-full xl:max-h-full xl:min-h-0 xl:justify-center xl:overflow-y-auto xl:overscroll-y-contain`}
            >
              <div
                className={`flex w-full min-w-0 max-w-full flex-col gap-1.5 xl:my-auto xl:max-h-full xl:min-h-0 xl:grow-0 xl:gap-2.5`}
              >
                <h2
                  className={`shrink-0 px-1 text-[11px] font-bold uppercase leading-none tracking-wider text-slate-500 dark:text-slate-400 xl:px-0 xl:text-left xl:text-xs xl:font-bold xl:leading-tight xl:tracking-wide xl:text-slate-600 xl:dark:text-slate-300`}
                >
                  Included Content & Resources
                </h2>
                <div
                  className={`flex min-h-0 min-w-0 flex-col touch-pan-y outline-none xl:min-h-0 xl:min-w-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-y-contain xl:pb-2 xl:pt-0.5 xl:[-webkit-overflow-scrolling:touch] xl:focus-visible:ring-2 xl:focus-visible:ring-blue-500 xl:focus-visible:ring-offset-2`}
                  tabIndex={0}
                  role="region"
                  aria-label="Included content and resources"
                >
                  <div
                    className={`flex min-h-0 w-full min-w-0 flex-col gap-y-5 xl:min-h-full xl:justify-center`}
                  >
                    {CONTENT_SECTIONS.map((section) => (
                      <div
                        key={section.title}
                        className={`shrink-0 rounded-xl border border-slate-200/60 bg-slate-50/50 p-1.5 dark:border-slate-700/50 dark:bg-slate-800/50 xl:rounded-xl xl:border xl:px-3.5 xl:py-2.5 xl:shadow-sm`}
                      >
                        <h3
                          className={`text-[13px] font-bold text-slate-800 dark:text-slate-100 xl:text-sm xl:font-bold xl:leading-tight`}
                        >
                          {section.title}
                        </h3>
                        <ul
                          className={`mt-0.5 grid grid-cols-2 gap-x-1.5 gap-y-1 xl:mt-1.5 xl:grid-cols-1 xl:gap-x-0 xl:gap-y-0.5 xl:text-[clamp(0.75rem,0.92vw,0.92rem)]`}
                        >
                          {section.items.map((item) => (
                            <li
                              key={item}
                              className={`min-w-0 flex items-start gap-0.5 text-[11px] leading-normal text-slate-700 dark:text-slate-300 xl:gap-1 xl:leading-snug`}
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
              </div>
            </div>
          </section>
        </div>

        <aside
          className={`mt-5 min-h-0 min-w-0 px-3 pb-0 pt-1 xl:col-span-1 xl:col-start-5 xl:row-start-1 xl:mt-0 xl:flex xl:h-full xl:min-h-0 xl:max-h-full xl:flex-col xl:justify-center xl:overflow-y-auto xl:overflow-x-hidden xl:rounded-br-3xl xl:rounded-tr-3xl xl:border-l-2 xl:border-slate-200 xl:bg-linear-to-b xl:from-slate-100 xl:to-slate-50 xl:px-3 xl:py-2 xl:dark:border-slate-600 xl:dark:from-slate-900/90 xl:dark:to-slate-800/90`}
        >
          <div
            className={`grid w-full min-w-0 grid-cols-3 gap-1 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col xl:justify-center xl:gap-y-5 xl:py-1`}
          >
            {INFO_PAGE_LINKS.map((item) => (
              <InfoQrBlock
                key={item.id}
                href={item.href}
                label={item.label}
                shortUrl={item.shortUrl}
                size={128}
                showShortUrl={false}
                className={`max-w-full rounded-lg border border-slate-200 bg-white/90 px-1 py-1 dark:border-slate-600 dark:bg-slate-900/70 xl:rounded-xl xl:border xl:px-2.5 xl:py-2.5 xl:shadow-sm [&_a]:max-w-full [&_a]:xl:p-2.5 [&_p]:xl:mt-2 [&_p]:xl:text-lg [&_p]:xl:font-semibold`}
              />
            ))}
          </div>
        </aside>
      </main>
    </div>
  )
}
