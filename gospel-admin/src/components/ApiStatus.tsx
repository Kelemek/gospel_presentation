'use client'

import { useState, useEffect } from 'react'

export default function ApiStatus() {
  const [apiStatus, setApiStatus] = useState<'loading' | 'online' | 'offline'>('loading')

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch('/api/scripture?reference=John+3:16')
        if (response.ok) {
          setApiStatus('online')
        } else {
          setApiStatus('offline')
        }
      } catch (error) {
        setApiStatus('offline')
      }
    }

    checkApiStatus()
  }, [])

  return (
    <div className="mb-4">
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
        apiStatus === 'online' 
          ? 'bg-green-100 text-green-800' 
          : apiStatus === 'offline'
          ? 'bg-red-100 text-red-800'
          : 'bg-yellow-100 text-yellow-800'
      }`}>
        <div className={`w-2 h-2 rounded-full mr-2 ${
          apiStatus === 'online' 
            ? 'bg-green-400' 
            : apiStatus === 'offline'
            ? 'bg-red-400'
            : 'bg-yellow-400 animate-pulse'
        }`} />
        ESV API: {apiStatus === 'loading' ? 'Checking...' : apiStatus}
      </div>
    </div>
  )
}