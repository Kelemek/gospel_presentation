'use client'

import Link from 'next/link'
import { useApplyPageThemeToDocument, usePageTheme } from '@/lib/usePageTheme'

export default function PrivacyPage() {
  const theme = usePageTheme()
  useApplyPageThemeToDocument(theme)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-linear-to-br from-slate-700 to-slate-800 text-white text-center py-10 shadow-lg">
        <div className="container mx-auto px-5">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            Privacy Policy
          </h1>
          <p className="text-xl md:text-2xl opacity-80">
            How the Gospel Presentation native app collects, uses, and protects your information
          </p>
        </div>
      </header>

      <main className="container mx-auto px-5 py-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-6 border-b border-gray-200 dark:border-slate-600 pb-3">Introduction</h2>
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg mb-4">
              This Privacy Policy applies to the <strong className="text-slate-800 dark:text-slate-100">Gospel Presentation</strong> native mobile app (Android and iOS). It describes what data the app uses, how it is stored, and your choices. This app does not require an account or sign-in.
            </p>
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-6 border-b border-gray-200 dark:border-slate-600 pb-3">Data We Collect</h2>
            <ul className="text-slate-700 dark:text-slate-200 space-y-3 leading-relaxed text-base md:text-lg">
              <li className="flex items-start">
                <span className="text-slate-600 dark:text-slate-400 font-bold mr-3">•</span>
                <span><strong className="text-slate-800 dark:text-slate-100">Usage data:</strong> which gospel profile you view, locally pinned scripture passages, and saved answers to questions—all stored only on your device.</span>
              </li>
              <li className="flex items-start">
                <span className="text-slate-600 dark:text-slate-400 font-bold mr-3">•</span>
                <span><strong className="text-slate-800 dark:text-slate-100">Device and local storage:</strong> the app caches profile content and progress on your device to improve load times and support offline use.</span>
              </li>
              <li className="flex items-start">
                <span className="text-slate-600 dark:text-slate-400 font-bold mr-3">•</span>
                <span><strong className="text-slate-800 dark:text-slate-100">Visit counts:</strong> we may record that a profile was viewed for aggregate usage (e.g. visit counts).</span>
              </li>
            </ul>
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-6 border-b border-gray-200 dark:border-slate-600 pb-3">How We Use Data</h2>
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg mb-4">
              We use the data above to provide the gospel presentation content and to improve the app. Cached data on your device is used to load content faster and to check for updates without re-downloading everything. Your progress and answers stay on your device unless you clear app data.
            </p>
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-6 border-b border-gray-200 dark:border-slate-600 pb-3">Storage and Third Parties</h2>
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg mb-4">
              Your progress, saved answers, and cached content are stored locally on your device. Scripture text is fetched from external Bible APIs (e.g. ESV API) when you view a passage; we do not store full scripture text long-term. We do not sell your data to third parties.
            </p>
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-6 border-b border-gray-200 dark:border-slate-600 pb-3">Data Retention and Your Choices</h2>
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg mb-4">
              Data stored by the app remains on your device until you clear it (e.g. via your device settings or by uninstalling the app). If you have questions about this Privacy Policy or your data, please contact us using the information below.
            </p>
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-6 border-b border-gray-200 dark:border-slate-600 pb-3">Contact</h2>
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
              For questions about this Privacy Policy or your data, contact: <a href="mailto:larsonm@cp-church.org" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors">larsonm@cp-church.org</a>.
            </p>
          </section>
        </div>
      </main>

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
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link href="/copyright" className="text-blue-400 hover:text-blue-300 underline transition-colors">
              Copyright & Attribution
            </Link>
          </div>
          <p className="mt-4 text-sm opacity-80 text-center">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. Gospel Presentation Project.
          </p>
        </div>
      </footer>
    </div>
  )
}
