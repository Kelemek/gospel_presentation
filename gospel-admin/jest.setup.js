// jest.setup.js
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

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

// Mock environment variables
process.env.ADMIN_PASSWORD = 'test-password-123'
process.env.GITHUB_TOKEN = 'test-github-token'
process.env.ESV_API_KEY = 'test-esv-key'
// Provide dummy Netlify credentials so server-side data service doesn't throw during tests
process.env.NETLIFY_SITE_ID = 'test-site-id'
process.env.NETLIFY_TOKEN = 'test-token'

// Mock Netlify blobs package (some packages ship ESM which Jest may not transform).
// Provide a minimal in-memory stub for getStore used by blob-data-service so tests
// don't try to import the real ESM package from node_modules.
jest.mock('@netlify/blobs', () => ({
  getStore: jest.fn(() => ({
    // Return null for gets by default so code falls back to file-based data
    get: jest.fn(async (key, opts) => null),
    // No-op setters
    setJSON: jest.fn(async (key, data) => {}),
    set: jest.fn(async (key, data) => {}),
  })),
}))

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