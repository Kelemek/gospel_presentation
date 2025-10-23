'use client'

import Link from 'next/link'

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-5">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">
              📝 Admin Dashboard
            </h1>
            
            <p className="text-slate-600 mb-6 leading-relaxed">
              Welcome to the Gospel Presentation admin interface. This page will allow you to 
              edit the content, manage scripture references, and update the presentation structure.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-blue-800 font-semibold mb-2">🚧 Coming Soon</h3>
              <p className="text-blue-700 text-sm">
                The admin editing interface is currently under development. Features will include:
              </p>
              <ul className="text-blue-700 text-sm mt-2 ml-4 list-disc">
                <li>Edit section titles and content</li>
                <li>Add/remove scripture references</li>
                <li>Reorder presentation sections</li>
                <li>Preview changes before publishing</li>
                <li>Export/import presentation data</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <Link 
                href="/"
                className="inline-block px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-md font-medium transition-colors"
              >
                ← Back to Presentation
              </Link>
              <button 
                disabled
                className="inline-block px-6 py-3 bg-gray-300 text-gray-500 rounded-md font-medium cursor-not-allowed"
              >
                🔒 Edit Mode (Coming Soon)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}