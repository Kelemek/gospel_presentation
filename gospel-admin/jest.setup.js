// jest.setup.js
import '@testing-library/jest-dom'

// Mock Next.js router and expose the push mock so tests can assert redirects
const _mockNextPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: _mockNextPush,
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))
// Expose to tests via global so they can assert calls
global.__mockNextPush = _mockNextPush

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    constructor(url, init = {}) {
      this.url = url
      this.method = init.method || 'GET'
      this.body = init.body
      this.headers = new Map()
    }
    
    async json() {
      if (typeof this.body === 'string') {
        return JSON.parse(this.body)
      }
      return this.body || {}
    }
  },
  NextResponse: {
    json: (data, init = {}) => ({
      json: () => Promise.resolve(data),
      status: init.status || 200,
    }),
  },
}))

// Mock environment variables for Supabase
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_KEY = 'test-service-key'
process.env.ESV_API_KEY = 'test-esv-key'

// Note: Netlify blobs were used historically. The project now uses Supabase for
// blob storage; remove legacy Netlify mocks when no tests require them.

// Mock fetch globally with a safe default implementation used when tests
// don't provide their own mocks. This prevents noisy console errors from
// components (e.g. AdminHeader) that call `/api/profiles` during render.
global.fetch = jest.fn((url, opts) => {
  const requestUrl = typeof url === 'string' ? url : (url && url.url) || ''

  // For specific profile fetches (e.g. /api/profiles/<slug>), return 404 by default
  if (/\/api\/profiles\/[^/?]+(?:\?|$)/.test(requestUrl)) {
    return Promise.resolve({ ok: false, status: 404, json: async () => ({ error: 'Not found' }) })
  }

  // Return empty list for profiles index to avoid `data.profiles.map` errors
  // Match index requests even when a query string is present (e.g. /api/profiles?include=...)
  if (/\/api\/profiles(?:\?.*)?$/.test(requestUrl)) {
    return Promise.resolve({ ok: true, json: async () => ({ profiles: [] }) })
  }

  // Fallback: empty successful response
  return Promise.resolve({ ok: true, json: async () => ({}) })
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.sessionStorage = sessionStorageMock

// Mock window.alert used by some pages when saving
global.alert = jest.fn()

// Silence noisy but harmless console.error messages coming from components
// that intentionally catch and log failures during tests (e.g. fetch shapes).
// We still forward other console.error calls so real failures are visible.
const _origConsoleError = console.error
console.error = (...args) => {
  try {
    const first = args[0]
    if (typeof first === 'string' && first.startsWith('Error fetching profiles:')) {
      // ignore this noisy, caught error during tests
      return
    }
  } catch (e) {
    // fallthrough to original
  }
  _origConsoleError.apply(console, args)
}

// Setup cleanup after each test
afterEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})

// Provide a lightweight mock for the local supabase `createClient` used by
// client components during tests. Tests that need different behavior can
// override this mock or set `localStorage['gospel-admin-auth']` with
// `{ isAuthenticated: true, sessionToken: '...' }` to simulate an authenticated
// user. This keeps component-level auth checks deterministic under jsdom.
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: async () => {
        // Prefer the test-level auth mock (if tests mock '@/lib/auth') so
        // test files that call jest.mock('@/lib/auth', ...) control auth state.
        try {
          // eslint-disable-next-line global-require
          const authMock = require('@/lib/auth')
          if (authMock && typeof authMock.isAuthenticated === 'function') {
            // If the test-level mock indicates authenticated, return a user
            if (authMock.isAuthenticated()) {
              return { data: { user: { id: 'test-user' } } }
            }
            return { data: { user: null } }
          }
        } catch (e) {
          // ignore require errors — fall back to localStorage
        }

        // Fallback: read explicit test-local storage marker used in some tests
        try {
          const raw = global.localStorage && global.localStorage.getItem && global.localStorage.getItem('gospel-admin-auth')
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed && parsed.isAuthenticated) {
              return { data: { user: { id: parsed.sessionToken || 'test-user' } } }
            }
          }
        } catch (e) {
          // ignore parse errors
        }

        // Default: return no user. Tests that need an authenticated user
        // should either mock '@/lib/auth' or set the test-local
        // 'gospel-admin-auth' localStorage marker with { isAuthenticated: true }.
        return { data: { user: null } }
      },
      signOut: async () => ({ error: null })
    },
    // Minimal `from` chain implementation used by client components during
    // tests (e.g. to load the user's role). Tests that need more realistic
    // behavior can override this mock.
    from: (table) => ({
      select: (cols) => ({
        eq: (col, val) => ({
          single: async () => {
            // Return a role for user_profiles, empty responses for profiles
            if (table === 'user_profiles') {
              return { data: { role: 'admin' } }
            }
            if (table === 'profiles') {
              return { data: { profiles: [] } }
            }
            return { data: null }
          }
        })
      })
    }),
    // Provide storage-like stubs for other common usages
    storage: {
      from: () => ({
        // no-op storage methods
        upload: async () => ({ data: null }),
        download: async () => ({ data: null })
      })
    }
  })
}))