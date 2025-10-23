// Custom 404 page for profile routes
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center px-4">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-400 mb-4">404</h1>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-6">
            The gospel presentation profile you're looking for doesn't exist or may have been removed.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link 
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            View Default Presentation
          </Link>
          
          <div className="text-sm text-gray-500">
            <p>Looking for a specific presentation?</p>
            <Link 
              href="/admin" 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Contact the administrator
            </Link>
          </div>
        </div>

        <div className="mt-12 p-4 bg-white rounded-lg shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-2">Available Options:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Return to the default gospel presentation</li>
            <li>• Check the URL for typos</li>
            <li>• Contact the site administrator for help</li>
          </ul>
        </div>
      </div>
    </div>
  )
}