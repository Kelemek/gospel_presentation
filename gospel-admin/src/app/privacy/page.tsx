'use client'

import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-linear-to-br from-slate-700 to-slate-800 text-white text-center py-10 shadow-lg">
        <div className="container mx-auto px-5">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            Privacy Policy
          </h1>
          <p className="text-xl md:text-2xl opacity-80">
            How the Gospel Presentation app collects, uses, and protects your information
          </p>
        </div>
      </header>

      <main className="container mx-auto px-5 py-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6 border-b border-gray-200 pb-3">Introduction</h2>
            <p className="text-slate-700 leading-relaxed text-base md:text-lg mb-4">
              This Privacy Policy applies to the <strong className="text-slate-800">Gospel Presentation</strong> app, including the web application and native mobile apps (Android and iOS). It describes what data we collect, how we use it, and your choices.
            </p>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6 border-b border-gray-200 pb-3">Data We Collect</h2>
            <ul className="text-slate-700 space-y-3 leading-relaxed text-base md:text-lg">
              <li className="flex items-start">
                <span className="text-slate-600 font-bold mr-3">•</span>
                <span><strong className="text-slate-800">If you sign in:</strong> email address and account information for authentication and access control.</span>
              </li>
              <li className="flex items-start">
                <span className="text-slate-600 font-bold mr-3">•</span>
                <span><strong className="text-slate-800">Usage data:</strong> which gospel profiles you view, scripture reading progress, and saved answers to questions when you use a non-default profile.</span>
              </li>
              <li className="flex items-start">
                <span className="text-slate-600 font-bold mr-3">•</span>
                <span><strong className="text-slate-800">Device and local storage:</strong> we cache profile content and progress on your device (e.g. in your browser or app storage) to improve load times and support offline-style use.</span>
              </li>
              <li className="flex items-start">
                <span className="text-slate-600 font-bold mr-3">•</span>
                <span><strong className="text-slate-800">Visit counts:</strong> we may record that a profile was viewed for aggregate usage (e.g. visit counts).</span>
              </li>
            </ul>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6 border-b border-gray-200 pb-3">How We Use Data</h2>
            <p className="text-slate-700 leading-relaxed text-base md:text-lg mb-4">
              We use the data above to provide the gospel presentation content, save your progress and answers when you are signed in, manage access to admin and counselor features, and improve the service. Cached data on your device is used to load content faster and to check for updates without re-downloading everything.
            </p>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6 border-b border-gray-200 pb-3">Storage and Third Parties</h2>
            <p className="text-slate-700 leading-relaxed text-base md:text-lg mb-4">
              Account and profile data, saved answers, and scripture progress (when signed in) are stored using <strong className="text-slate-800">Supabase</strong> (database and authentication). Scripture text is fetched from external Bible APIs (e.g. ESV API) when you view a passage; we do not store full scripture text long-term. We do not sell your data to third parties.
            </p>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6 border-b border-gray-200 pb-3">Data Retention and Your Choices</h2>
            <p className="text-slate-700 leading-relaxed text-base md:text-lg mb-4">
              Account data is retained while your account exists. Cached data on your device can be cleared through your browser or device settings. You can sign out at any time from within the app. If you have questions about accessing or deleting your data, please contact us using the information below.
            </p>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6 border-b border-gray-200 pb-3">Contact</h2>
            <p className="text-slate-700 leading-relaxed text-base md:text-lg">
              For questions about this Privacy Policy or your data, contact: <a href="mailto:markdlarson@me.com" className="text-blue-600 hover:text-blue-800 underline transition-colors">markdlarson@me.com</a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="bg-slate-700 text-white py-10 mt-16">
        <div className="container mx-auto px-5 max-w-3xl">
          <div className="mb-8 flex justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-slate-600 hover:bg-slate-500 text-white px-6 py-4 rounded-lg transition-colors font-medium text-base md:text-lg min-h-[48px]"
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
