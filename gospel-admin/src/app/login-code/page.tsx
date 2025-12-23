'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginCodeRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/login/magic-link')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecting...</p>
    </div>
  )
}
