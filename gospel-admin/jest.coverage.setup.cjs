// Lightweight CommonJS test setup used only for focused coverage runs.
// Keep this minimal and CommonJS so Jest can load it without babel/ts-jest.
// provide testing-library DOM matchers
try {
  require('@testing-library/jest-dom')
} catch (e) {
  // ignore if not available — tests will still run but some assertions may fail
}

// Provide a minimal global Response.redirect for route tests that call Response.redirect
if (typeof global.Response === 'undefined') {
  global.Response = {
    redirect: (url, status) => ({ status })
  }
}

// Mock Vercel packages (no-op React components)
jest.mock('@vercel/analytics/react', () => ({ Analytics: () => null }))
jest.mock('@vercel/speed-insights/next', () => ({ SpeedInsights: () => null }))

// Mock Next navigation and expose push mock
jest.mock('next/navigation', () => {
  const pushMock = jest.fn()
  global.__mockNextPush = pushMock
  return {
    useRouter: () => ({ push: pushMock, replace: jest.fn(), back: jest.fn(), forward: jest.fn(), refresh: jest.fn(), prefetch: jest.fn() }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/',
  }
})

// Minimal next/server mocks used by API route tests
jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    constructor(url, init = {}) {
      this.url = url
      this.method = init.method || 'GET'
      this.body = init.body
      this.headers = new Map()
    }
    async json() {
      if (typeof this.body === 'string') return JSON.parse(this.body)
      return this.body || {}
    }
  },
  NextResponse: {
    json: (data, init = {}) => ({ json: () => Promise.resolve(data), status: init.status || 200 }),
  },
}))

// Minimal env vars for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon'
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'service'
process.env.ESV_API_KEY = process.env.ESV_API_KEY || 'esv'

// Minimal fetch mock
global.fetch = jest.fn((url, opts) => Promise.resolve({ ok: true, json: async () => ({}) }))
