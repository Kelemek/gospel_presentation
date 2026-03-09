'use client'

import Link from 'next/link'
import { useApplyPageThemeToDocument, usePageTheme } from '@/lib/usePageTheme'

export default function CopyrightPage() {
  const theme = usePageTheme()
  useApplyPageThemeToDocument(theme)

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
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
                <strong className="text-slate-800 dark:text-slate-100">Original Resource:</strong> <a href="https://oneeightyministries.org/resources/the-gospel-in-context/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors">oneeightyministries.org/resources/the-gospel-in-context/</a>
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/30 border-l-4 border-purple-400 dark:border-purple-600 rounded-lg p-6 mb-6">
              <p className="text-slate-700 dark:text-slate-200 mb-3 leading-relaxed text-base md:text-lg">
                <strong className="text-slate-800 dark:text-slate-100">Marriage Enrichment Content:</strong> &ldquo;God-Centered Marriage: A Marriage Enrichment Seminar from a Biblical Perspective&rdquo; by Dr. Randy Westerberg
              </p>
            </div>

            <div className="bg-teal-50 dark:bg-teal-900/30 border-l-4 border-teal-400 dark:border-teal-600 rounded-lg p-6 mb-6">
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
                <strong className="text-slate-800 dark:text-slate-100">Praying As A Couple:</strong> by Jared Johnson
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-400 dark:border-amber-600 rounded-lg p-6 mb-6">
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
                <strong className="text-slate-800 dark:text-slate-100">The Four Rules of Communication (A Practical Application to Good Communication):</strong> by Robert Smith
              </p>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-indigo-400 dark:border-indigo-600 rounded-lg p-6">
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
                <strong className="text-slate-800 dark:text-slate-100">The Conference Table:</strong> by Jay Adams
              </p>
            </div>
          </section>

          {/* Scripture Attribution Section */}
          <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-6 border-b border-gray-200 dark:border-slate-600 pb-3">Scripture Attribution</h2>
            
            <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-400 dark:border-green-600 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">English Standard Version (ESV)</h3>
              <p className="text-slate-700 dark:text-slate-200 mb-4 leading-relaxed text-base md:text-lg">
                Scripture quotations are from the <strong>ESV® Bible</strong> (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved. The ESV text may not be quoted in any publication made available to the public by a Creative Commons license. The ESV may not be translated into any other language.
              </p>
              <p className="text-slate-700 dark:text-slate-200 mb-4 leading-relaxed text-base md:text-lg">
                Users may not copy or download more than 500 verses of the ESV Bible or more than one half of any book of the ESV Bible.
              </p>
              <p className="text-slate-700 dark:text-slate-200 text-base md:text-lg">
                <strong className="text-slate-800 dark:text-slate-100">ESV API:</strong> <a href="https://www.esv.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors">www.esv.org</a>
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-600 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">King James Version (KJV)</h3>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
                Scripture quotations from the King James Version (KJV) are in the public domain.
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/30 border-l-4 border-purple-400 dark:border-purple-600 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">New American Standard Bible (NASB)</h3>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
                Scripture quotations taken from the <strong>New American Standard Bible®</strong> (NASB), Copyright © 1960, 1962, 1963, 1968, 1971, 1972, 1973, 1975, 1977, 1995 by The Lockman Foundation. Used by permission. <a href="https://www.lockman.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors">www.lockman.org</a>
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-400 dark:border-amber-600 rounded-lg p-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">Legacy Standard Bible (LSB)</h3>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg mb-4">
                Legacy Standard Bible Copyright ©2021 by The Lockman Foundation. All rights reserved. Managed in partnership with Three Sixteen Publishing Inc.{' '}
                <a href="https://www.LSBible.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors">LSBible.org</a>
              </p>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
                For Permission to Quote Information visit{' '}
                <a href="https://www.LSBible.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors">www.LSBible.org</a>
              </p>
            </div>
          </section>

          {/* Usage Terms Section */}
          <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-6 border-b border-gray-200 dark:border-slate-600 pb-3">Usage Terms</h2>
            <div className="bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-400 dark:border-amber-600 rounded-lg p-6">
              <ul className="text-slate-700 dark:text-slate-200 space-y-3 leading-relaxed text-base md:text-lg">
                <li className="flex items-start">
                  <span className="text-amber-600 dark:text-amber-400 font-bold mr-3">•</span>
                  <span>This site is for non-commercial, ministry use only</span>
                </li>
                <li className="flex items-start">
                  <span className="text-amber-600 dark:text-amber-400 font-bold mr-3">•</span>
                  <span>Scripture text is fetched dynamically via the ESV API</span>
                </li>
                <li className="flex items-start">
                  <span className="text-amber-600 dark:text-amber-400 font-bold mr-3">•</span>
                  <span>No scripture text is stored locally beyond temporary display</span>
                </li>
                <li className="flex items-start">
                  <span className="text-amber-600 dark:text-amber-400 font-bold mr-3">•</span>
                  <span>Users are limited to viewing individual passages as displayed</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Technical Implementation Section */}
          <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-6 border-b border-gray-200 dark:border-slate-600 pb-3">Technical Implementation</h2>
            <div className="bg-slate-50 dark:bg-slate-700/50 border-l-4 border-slate-400 dark:border-slate-500 rounded-lg p-6">
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
                  <strong className="text-slate-800 dark:text-slate-100">Scripture APIs:</strong> ESV API v3
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
            <Link 
              href="/"
              className="inline-flex items-center gap-2 bg-slate-600 dark:bg-slate-700 hover:bg-slate-500 dark:hover:bg-slate-600 text-white px-6 py-4 rounded-lg transition-colors font-medium text-base md:text-lg min-h-[48px]"
            >
              <span>←</span>
              Back to Gospel Presentation
            </Link>
          </div>
          <div className="space-y-4 text-sm opacity-90 leading-relaxed text-center md:text-left">
            <p>
              Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission.
            </p>
            <p>King James Version (KJV) scripture quotations are in the public domain.</p>
            <p>
              New American Standard Bible® (NASB), Copyright © 1960, 1962, 1963, 1968, 1971, 1972, 1973, 1975, 1977, 1995 by The Lockman Foundation. Used by permission.
            </p>
            <p>
              Legacy Standard Bible Copyright ©2021 by The Lockman Foundation. All rights reserved. Managed in partnership with Three Sixteen Publishing Inc.{' '}
              <a href="https://www.LSBible.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">LSBible.org</a>.
              {' '}For Permission to Quote Information visit{' '}
              <a href="https://www.LSBible.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">www.LSBible.org</a>.
            </p>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-600 dark:border-slate-700 flex flex-wrap justify-center gap-x-6 gap-y-2">
            <a href="https://www.esv.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline transition-colors">
              www.esv.org
            </a>
            <a href="https://www.lockman.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline transition-colors">
              www.lockman.org
            </a>
            <a href="https://www.LSBible.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline transition-colors">
              LSBible.org
            </a>
          </div>
          <p className="mt-4 text-sm opacity-80 text-center">
            All other content © {new Date().getFullYear()} Gospel Presentation Project. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}