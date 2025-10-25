'use client'

import Link from 'next/link'

export default function CopyrightPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header matching the main page style */}
      <header className="bg-gradient-to-br from-slate-700 to-slate-800 text-white text-center py-10 shadow-lg">
        <div className="container mx-auto px-5">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Copyright & Attribution
          </h1>
          <p className="text-lg opacity-80">
            Legal information and content attributions for this gospel presentation
          </p>
        </div>
      </header>

      <main className="container mx-auto px-5 py-10">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Content Attribution Section */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b border-gray-200 pb-3">Content Attribution</h2>
            <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-6">
              <p className="text-slate-700 mb-3 leading-relaxed">
                <strong className="text-slate-800">Gospel Presentation Content:</strong> "Presenting the Gospel in its Context" by Dr. Stuart Scott
              </p>
            </div>
          </section>

          {/* Scripture Attribution Section */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b border-gray-200 pb-3">Scripture Attribution</h2>
            <div className="bg-green-50 border-l-4 border-green-400 rounded-lg p-6">
              <p className="text-slate-700 mb-4 leading-relaxed">
                Scripture quotations are from the <strong>ESV® Bible</strong> (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved. The ESV text may not be quoted in any publication made available to the public by a Creative Commons license. The ESV may not be translated into any other language.
              </p>
              <p className="text-slate-700 mb-4 leading-relaxed">
                Users may not copy or download more than 500 verses of the ESV Bible or more than one half of any book of the ESV Bible.
              </p>
              <p className="text-slate-700">
                <strong className="text-slate-800">ESV API:</strong> <a href="https://www.esv.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline transition-colors">www.esv.org</a>
              </p>
            </div>
          </section>

          {/* Usage Terms Section */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b border-gray-200 pb-3">Usage Terms</h2>
            <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-6">
              <ul className="text-slate-700 space-y-3 leading-relaxed">
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
            <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b border-gray-200 pb-3">Technical Implementation</h2>
            <div className="bg-slate-50 border-l-4 border-slate-400 rounded-lg p-6">
              <div className="space-y-3">
                <p className="text-slate-700">
                  <strong className="text-slate-800">Framework:</strong> Next.js 16 (React 19)
                </p>
                <p className="text-slate-700">
                  <strong className="text-slate-800">Language:</strong> TypeScript
                </p>
                <p className="text-slate-700">
                  <strong className="text-slate-800">UI:</strong> Tailwind CSS, Geist font
                </p>
                <p className="text-slate-700">
                  <strong className="text-slate-800">Authentication:</strong> Session-based authentication
                </p>
                <p className="text-slate-700">
                  <strong className="text-slate-800">Scripture Integration:</strong> ESV API v3 (dynamic text retrieval)
                </p>
                <p className="text-slate-700">
                  <strong className="text-slate-800">Data Storage:</strong> Netlify Blob Storage (profiles, gospel data)
                </p>
                <p className="text-slate-700">
                  <strong className="text-slate-800">Hosting:</strong> Netlify (static site + serverless API functions)
                </p>
                <p className="text-slate-700">
                  <strong className="text-slate-800">Testing:</strong> Jest, React Testing Library, MSW
                </p>
                <p className="text-slate-700">
                  <strong className="text-slate-800">Admin Features:</strong> Profile management, favorites, analytics, live preview
                </p>
                <p className="text-slate-700">
                  <strong className="text-slate-800">Source Control:</strong> <a href="https://github.com/Kelemek/gospel_presentation" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">GitHub Repository</a>
                </p>
                <p className="text-slate-700">
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
              className="inline-flex items-center gap-2 bg-slate-600 hover:bg-slate-500 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              <span>←</span>
              Back to Gospel Presentation
            </Link>
          </div>
          <p className="text-sm opacity-80 mb-2">
            Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission.
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