'use client'

import Link from 'next/link'

export default function CopyrightPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header matching the main page style */}
      <header className="bg-gradient-to-br from-slate-700 to-slate-800 text-white text-center py-10 shadow-lg">
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
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6 border-b border-gray-200 pb-3">Content Attribution</h2>
            
            <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-6 mb-6">
              <p className="text-slate-700 mb-3 leading-relaxed text-base md:text-lg">
                <strong className="text-slate-800">Gospel Presentation Content:</strong> "Presenting the Gospel in its Context" by Dr. Stuart Scott
              </p>
              <p className="text-slate-700 leading-relaxed text-base md:text-lg">
                <strong className="text-slate-800">Original Resource:</strong> <a href="https://oneeightyministries.org/resources/the-gospel-in-context/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline transition-colors">oneeightyministries.org/resources/the-gospel-in-context/</a>
              </p>
            </div>

            <div className="bg-purple-50 border-l-4 border-purple-400 rounded-lg p-6">
              <p className="text-slate-700 mb-3 leading-relaxed text-base md:text-lg">
                <strong className="text-slate-800">Marriage Enrichment Content:</strong> "God-Centered Marriage: A Marriage Enrichment Seminar from a Biblical Perspective" by Dr. Randy Westerberg
              </p>
            </div>
          </section>

          {/* Scripture Attribution Section */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6 border-b border-gray-200 pb-3">Scripture Attribution</h2>
            
            <div className="bg-green-50 border-l-4 border-green-400 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-slate-800 mb-3">English Standard Version (ESV)</h3>
              <p className="text-slate-700 mb-4 leading-relaxed text-base md:text-lg">
                Scripture quotations are from the <strong>ESV® Bible</strong> (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved. The ESV text may not be quoted in any publication made available to the public by a Creative Commons license. The ESV may not be translated into any other language.
              </p>
              <p className="text-slate-700 mb-4 leading-relaxed text-base md:text-lg">
                Users may not copy or download more than 500 verses of the ESV Bible or more than one half of any book of the ESV Bible.
              </p>
              <p className="text-slate-700 text-base md:text-lg">
                <strong className="text-slate-800">ESV API:</strong> <a href="https://www.esv.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline transition-colors">www.esv.org</a>
              </p>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-slate-800 mb-3">King James Version (KJV)</h3>
              <p className="text-slate-700 mb-4 leading-relaxed text-base md:text-lg">
                Scripture quotations from the King James Version (KJV) are in the public domain.
              </p>
              <p className="text-slate-700 text-base md:text-lg">
                <strong className="text-slate-800">Provided by:</strong> <a href="https://scripture.api.bible" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline transition-colors">API.Bible</a>
              </p>
            </div>

            <div className="bg-purple-50 border-l-4 border-purple-400 rounded-lg p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-3">New American Standard Bible (NASB 1995)</h3>
              <p className="text-slate-700 mb-4 leading-relaxed text-base md:text-lg">
                Scripture quotations taken from the <strong>New American Standard Bible®</strong> (NASB), Copyright © 1960, 1962, 1963, 1968, 1971, 1972, 1973, 1975, 1977, 1995 by The Lockman Foundation. Used by permission. All rights reserved. <a href="https://www.lockman.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline transition-colors">www.lockman.org</a>
              </p>
              <p className="text-slate-700 text-base md:text-lg">
                <strong className="text-slate-800">Provided by:</strong> <a href="https://scripture.api.bible" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline transition-colors">API.Bible</a>
              </p>
            </div>
          </section>

          {/* Usage Terms Section */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6 border-b border-gray-200 pb-3">Usage Terms</h2>
            <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-6">
              <ul className="text-slate-700 space-y-3 leading-relaxed text-base md:text-lg">
                <li className="flex items-start">
                  <span className="text-amber-600 font-bold mr-3">•</span>
                  <span>This site is for non-commercial, ministry use only</span>
                </li>
                <li className="flex items-start">
                  <span className="text-amber-600 font-bold mr-3">•</span>
                  <span>Scripture text is fetched dynamically via the ESV API</span>
                </li>
                <li className="flex items-start">
                  <span className="text-amber-600 font-bold mr-3">•</span>
                  <span>No scripture text is stored locally beyond temporary display</span>
                </li>
                <li className="flex items-start">
                  <span className="text-amber-600 font-bold mr-3">•</span>
                  <span>Users are limited to viewing individual passages as displayed</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Technical Implementation Section */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6 border-b border-gray-200 pb-3">Technical Implementation</h2>
            <div className="bg-slate-50 border-l-4 border-slate-400 rounded-lg p-6">
              <div className="space-y-3">
                <p className="text-slate-700 text-base md:text-lg">
                  <strong className="text-slate-800">Framework:</strong> Next.js 16 (React 19, App Router)
                </p>
                <p className="text-slate-700 text-base md:text-lg">
                  <strong className="text-slate-800">Language:</strong> TypeScript
                </p>
                <p className="text-slate-700 text-base md:text-lg">
                  <strong className="text-slate-800">UI:</strong> Tailwind CSS 4, Geist font
                </p>
                <p className="text-slate-700 text-base md:text-lg">
                  <strong className="text-slate-800">Database:</strong> Supabase PostgreSQL with Row-Level Security (RLS)
                </p>
                <p className="text-slate-700 text-base md:text-lg">
                  <strong className="text-slate-800">Authentication:</strong> Supabase Auth with passwordless magic links
                </p>
                <p className="text-slate-700 text-base md:text-lg">
                  <strong className="text-slate-800">User Roles:</strong> Admin (full access) & Counselor (own profiles only)
                </p>
                <p className="text-slate-700 text-base md:text-lg">
                  <strong className="text-slate-800">Scripture APIs:</strong> ESV API v3, <a href="https://scripture.api.bible" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline transition-colors">API.Bible</a> (KJV, NASB)
                </p>
                <p className="text-slate-700 text-base md:text-lg">
                  <strong className="text-slate-800">Rich Text Editor:</strong> <a href="https://tiptap.dev" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline transition-colors">Tiptap Editor</a> (MIT License)
                </p>
                <p className="text-slate-700 text-base md:text-lg">
                  <strong className="text-slate-800">Hosting:</strong> Vercel (Edge Network, automatic deployments)
                </p>
                <p className="text-slate-700 text-base md:text-lg">
                  <strong className="text-slate-800">Security:</strong> Row-Level Security policies, secure session management
                </p>
                <p className="text-slate-700 text-base md:text-lg">
                  <strong className="text-slate-800">Features:</strong> Multi-user profiles, backup/restore, profile sharing, favorites
                </p>
                <p className="text-slate-700 text-base md:text-lg">
                  <strong className="text-slate-800">Testing:</strong> Jest, React Testing Library, MSW (Mock Service Worker)
                </p>
                <p className="text-slate-700 text-base md:text-lg">
                  <strong className="text-slate-800">Source Control:</strong> <a href="https://github.com/Kelemek/gospel_presentation" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">GitHub Repository</a>
                </p>
                <p className="text-slate-700 text-base md:text-lg">
                  <strong className="text-slate-800">Author & Maintainer:</strong> Mark Larson (<a href="mailto:markdlarson@me.com" className="text-blue-500 underline">markdlarson@me.com</a>)
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer matching the main page style */}
      <footer className="bg-slate-700 text-white text-center py-8 mt-16">
        <div className="container mx-auto px-5">
          <div className="mb-6">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 bg-slate-600 hover:bg-slate-500 text-white px-6 py-4 rounded-lg transition-colors font-medium text-base md:text-lg min-h-[48px]"
            >
              <span>←</span>
              Back to Gospel Presentation
            </Link>
          </div>
          <p className="text-sm opacity-80 mb-2">
            Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission.
          </p>
          <p className="text-sm opacity-80 mb-2">
            King James Version (KJV) scripture quotations are in the public domain. New American Standard Bible® (NASB 1995), © 1960-1995 by The Lockman Foundation. Used by permission. Provided by <a href="https://scripture.api.bible" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">API.Bible</a>.
          </p>
          <p className="text-sm opacity-80">
              <a href="https://www.esv.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline mr-4 transition-colors">
                www.esv.org
              </a>
              <span className="ml-2">All other content © {new Date().getFullYear()} Gospel Presentation Project. All rights reserved.</span>
          </p>
        </div>
      </footer>
    </div>
  )
}