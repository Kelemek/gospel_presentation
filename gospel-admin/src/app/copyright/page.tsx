'use client'

import Link from 'next/link'
import { AcbcExternalResourceLinksAttribution } from '@/components/AcbcExternalResourceLinksAttribution'
import { CcelPublicDomainAttribution } from '@/components/CcelPublicDomainAttribution'
import { McheyneReadingPlanAttribution } from '@/components/McheyneReadingPlanAttribution'
import { CopyrightScriptureAttributionSections } from '@/components/CopyrightScriptureAttributionSections'
import { ScriptureFooterAttributionParagraphs } from '@/components/ScriptureFooterAttributionParagraphs'
import { CCEL_COPYRIGHT_ATTRIBUTIONS, CCEL_COPYRIGHT_POLICY_URL } from '@/lib/ccelCopyrightAttributions'
import { useTranslation } from '@/contexts/TranslationContext'
import { useApplyPageThemeToDocument, usePageTheme } from '@/lib/usePageTheme'

export default function CopyrightPage() {
  const theme = usePageTheme()
  useApplyPageThemeToDocument(theme)
  const { enabledTranslations, isLoading } = useTranslation()
  const attributionEnabledCodes = isLoading ? null : enabledTranslations

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header matching the main page style */}
      <header className="bg-linear-to-br from-slate-700 to-slate-800 text-white text-center py-10 shadow-lg">
        <div className="container mx-auto px-5">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            Copyright & Attribution
          </h1>
          <p className="text-xl md:text-2xl opacity-80">
            Legal information and content attributions for this gospel presentation
          </p>
        </div>
      </header>

      <main className="container mx-auto px-5 py-10">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Content Attribution Section */}
          <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-6 border-b border-gray-200 dark:border-slate-600 pb-3">Content Attribution</h2>
            
            <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-600 rounded-lg p-6 mb-6">
              <p className="text-slate-700 dark:text-slate-200 mb-3 leading-relaxed text-base md:text-lg">
                <strong className="text-slate-800 dark:text-slate-100">Gospel Presentation Content:</strong> &ldquo;Presenting the Gospel in its Context&rdquo; by Dr. Stuart Scott
              </p>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg min-w-0">
                <strong className="text-slate-800 dark:text-slate-100">Original Resource:</strong>{' '}
                <a
                  href="https://oneeightyministries.org/resources/the-gospel-in-context/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors break-all inline-block max-w-full"
                >
                  oneeightyministries.org/resources/the-gospel-in-context/
                </a>
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-600 rounded-lg p-6 mb-6">
              <p className="text-slate-700 dark:text-slate-200 mb-3 leading-relaxed text-base md:text-lg">
                <strong className="text-slate-800 dark:text-slate-100">Marriage Enrichment Content:</strong> &ldquo;God-Centered Marriage: A Marriage Enrichment Seminar from a Biblical Perspective&rdquo; by Dr. Randy Westerberg
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-600 rounded-lg p-6 mb-6">
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
                <strong className="text-slate-800 dark:text-slate-100">Praying As A Couple:</strong> by Jared Johnson
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-600 rounded-lg p-6 mb-6">
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
                <strong className="text-slate-800 dark:text-slate-100">The Four Rules of Communication (A Practical Application to Good Communication):</strong> by Robert Smith
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-600 rounded-lg p-6 mb-6">
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
                <strong className="text-slate-800 dark:text-slate-100">The Conference Table:</strong> by Jay Adams
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-600 rounded-lg p-6 mb-6">
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
                <strong className="text-slate-800 dark:text-slate-100">The Doctrine of Repentance:</strong> by Thomas Watson; compilation and arrangement by Mark Larson
              </p>
            </div>

            <McheyneReadingPlanAttribution className="mb-6" />

            <AcbcExternalResourceLinksAttribution className="mb-6" />

            <h3 className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-100 mt-8 mb-3">
              Christian Classics Ethereal Library (CCEL)
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base md:text-lg mb-6">
              Classic texts below were imported from CCEL. The underlying works are generally in the
              public domain in the United States; editions may include introductions, markup, or other
              material with separate terms. See{' '}
              <a
                href={CCEL_COPYRIGHT_POLICY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors break-all"
              >
                CCEL copyright information
              </a>{' '}
              for personal, educational, and non-profit use.
            </p>
            <div className="space-y-6">
              {CCEL_COPYRIGHT_ATTRIBUTIONS.map((attribution) => (
                <CcelPublicDomainAttribution key={attribution.title} attribution={attribution} />
              ))}
            </div>
          </section>

          {/* Scripture Attribution Section */}
          <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-6 border-b border-gray-200 dark:border-slate-600 pb-3">Scripture Attribution</h2>
            <CopyrightScriptureAttributionSections enabledTranslationCodes={attributionEnabledCodes} />
          </section>

          {/* Usage Terms Section */}
          <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-6 border-b border-gray-200 dark:border-slate-600 pb-3">Usage Terms</h2>
            <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-600 rounded-lg p-6">
              <ul className="text-slate-700 dark:text-slate-200 space-y-3 leading-relaxed text-base md:text-lg">
                <li className="flex items-start">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mr-3">•</span>
                  <span>This site is for non-commercial, ministry use only</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mr-3">•</span>
                  <span>
                    Scripture text is loaded dynamically via the ESV API, via{' '}
                    <a
                      href="https://rest.api.bible"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors"
                    >
                      API.Bible
                    </a>{' '}
                    when API.Bible-backed translations are enabled (KJV, NASB, LSB, NIV, NLT, CSB)
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mr-3">•</span>
                  <span>
                    ESV and API.Bible translations may be held in a bounded server cache (under 500 verses per
                    translation, refreshed on a rolling schedule) to follow provider guidance
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mr-3">•</span>
                  <span>
                    <strong className="text-slate-800 dark:text-slate-100">Word study (STEP Bible):</strong>{' '}
                    Hebrew and Greek word data and lexicons are from{' '}
                    <a
                      href="https://www.stepbible.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors"
                    >
                      STEP Bible
                    </a>{' '}
                    (Tyndale House, Cambridge), licensed under{' '}
                    <a
                      href="https://creativecommons.org/licenses/by/4.0/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors"
                    >
                      CC BY 4.0
                    </a>
                    . Brief Greek definitions draw on Abbott-Smith; brief Hebrew on abridged BDB; full Greek entries
                    use formatted LSJ where provided in STEPBible-Data. Strong’s concordance (verse lists per
                    number) is built from the same TAGNT/TAHOT amalgamated word data at import time.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mr-3">•</span>
                  <span>Users are limited to viewing individual passages as displayed</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mr-3">•</span>
                  <span>
                    <strong className="text-slate-800 dark:text-slate-100">API.Bible (KJV, NASB, LSB, NIV, NLT, CSB):</strong>{' '}
                    Use is governed by{' '}
                    <a
                      href="https://docs.api.bible/terms-and-conditions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors"
                    >
                      API.Bible terms and conditions
                    </a>
                    , publisher licenses, and non-commercial use expectations described in their documentation.
                    Commercial use requires separate approval from API.Bible.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mr-3">•</span>
                  <span>
                    API.Bible access is rate-limited by the provider (for example, a daily query cap per API key and
                    limits on consecutive verses per request); this application uses caching to reduce repeat API
                    calls.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mr-3">•</span>
                  <span>
                    API.Bible-backed translations must be shown with the publisher copyright / attribution text required by
                    API.Bible and the respective publishers (see Scripture Attribution above and the scripture modal).
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* Analytics & diagnostics */}
          <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-6 border-b border-gray-200 dark:border-slate-600 pb-3">
              Analytics &amp; diagnostics
            </h2>
            <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-600 rounded-lg p-6 space-y-3">
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
                This site uses{' '}
                <a
                  href="https://posthog.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors"
                >
                  PostHog
                </a>{' '}
                (cloud, free tier) for aggregated usage analytics, error reporting, and sampled session replay to improve reliability and usability.
                Session recordings mask form inputs in the browser. A subset of sessions is recorded to stay within free-tier limits.
              </p>
            </div>
          </section>

          {/* Technical Implementation Section */}
          <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-6 border-b border-gray-200 dark:border-slate-600 pb-3">Technical Implementation</h2>
            <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-600 rounded-lg p-6">
              <div className="space-y-3">
                <p className="text-slate-700 dark:text-slate-200 text-base md:text-lg">
                  <strong className="text-slate-800 dark:text-slate-100">Framework:</strong> Next.js 16 (React 19, App Router)
                </p>
                <p className="text-slate-700 dark:text-slate-200 text-base md:text-lg">
                  <strong className="text-slate-800 dark:text-slate-100">Language:</strong> TypeScript
                </p>
                <p className="text-slate-700 dark:text-slate-200 text-base md:text-lg">
                  <strong className="text-slate-800 dark:text-slate-100">UI:</strong> Tailwind CSS 4, Geist font
                </p>
                <p className="text-slate-700 dark:text-slate-200 text-base md:text-lg">
                  <strong className="text-slate-800 dark:text-slate-100">Database:</strong> Supabase PostgreSQL with Row-Level Security (RLS)
                </p>
                <p className="text-slate-700 dark:text-slate-200 text-base md:text-lg">
                  <strong className="text-slate-800 dark:text-slate-100">Authentication:</strong> Supabase Auth with email verification codes
                </p>
                <p className="text-slate-700 dark:text-slate-200 text-base md:text-lg">
                  <strong className="text-slate-800 dark:text-slate-100">User Roles:</strong> Admin (full access), Counselor (own profiles only) & Counselee (view-only access)
                </p>
                <p className="text-slate-700 dark:text-slate-200 text-base md:text-lg">
                  <strong className="text-slate-800 dark:text-slate-100">Scripture APIs:</strong> ESV API v3; API.Bible (REST) for KJV, NASB, LSB, NIV, NLT, and CSB when configured
                </p>
                <p className="text-slate-700 dark:text-slate-200 text-base md:text-lg">
                  <strong className="text-slate-800 dark:text-slate-100">Rich Text Editor:</strong> <a href="https://tiptap.dev" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors">Tiptap Editor</a> (MIT License)
                </p>
                <p className="text-slate-700 dark:text-slate-200 text-base md:text-lg">
                  <strong className="text-slate-800 dark:text-slate-100">Hosting:</strong> Vercel (Edge Network, automatic deployments)
                </p>
                <p className="text-slate-700 dark:text-slate-200 text-base md:text-lg">
                  <strong className="text-slate-800 dark:text-slate-100">Security:</strong> Row-Level Security policies, secure session management
                </p>
                <p className="text-slate-700 dark:text-slate-200 text-base md:text-lg">
                  <strong className="text-slate-800 dark:text-slate-100">Features:</strong> Multi-user profiles, backup/restore, profile sharing, favorites
                </p>
                <p className="text-slate-700 dark:text-slate-200 text-base md:text-lg">
                  <strong className="text-slate-800 dark:text-slate-100">Testing:</strong> Jest, React Testing Library, MSW (Mock Service Worker)
                </p>
                <p className="text-slate-700 dark:text-slate-200 text-base md:text-lg">
                  <strong className="text-slate-800 dark:text-slate-100">Source Control:</strong> <a href="https://github.com/Kelemek/gospel_presentation" target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 underline">GitHub Repository</a>
                </p>
                <p className="text-slate-700 dark:text-slate-200 text-base md:text-lg">
                  <strong className="text-slate-800 dark:text-slate-100">Author & Maintainer:</strong> Mark Larson (<a href="mailto:larsonm@cp-church.org" className="text-blue-500 dark:text-blue-400 underline">larsonm@cp-church.org</a>)
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer matching the main page style */}
      <footer className="bg-slate-700 dark:bg-slate-800 text-white py-10 mt-16">
        <div className="container mx-auto px-5 max-w-3xl">
          <div className="mb-8 flex justify-center">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-slate-600 dark:bg-slate-700 hover:bg-slate-500 dark:hover:bg-slate-600 text-white px-6 py-4 rounded-lg transition-colors font-medium text-base md:text-lg min-h-[48px]"
              >
                <span>←</span>
                Back to Gospel Presentation
              </Link>
              <Link
                href="/info"
                className="inline-flex items-center gap-2 bg-slate-600 dark:bg-slate-700 hover:bg-slate-500 dark:hover:bg-slate-600 text-white px-6 py-4 rounded-lg transition-colors font-medium text-base md:text-lg min-h-[48px]"
              >
                App Info & QR Codes
              </Link>
            </div>
          </div>
          <div className="space-y-4 text-sm opacity-90 leading-relaxed text-center md:text-left">
            <ScriptureFooterAttributionParagraphs
              anchorClassName="text-blue-400 hover:text-blue-300 underline transition-colors"
              enabledTranslationCodes={attributionEnabledCodes}
            />
          </div>
          <p className="mt-8 pt-6 border-t border-slate-600 dark:border-slate-700 text-sm opacity-80 text-center">
            All other content © {new Date().getFullYear()} Gospel Presentation Project. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}