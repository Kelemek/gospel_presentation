// jest.setup.js
require('@testing-library/jest-dom')
require('fake-indexeddb/auto')

// fake-indexeddb uses structuredClone; Jest's jsdom does not provide it.
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (value) => JSON.parse(JSON.stringify(value))
}

// Create push mock once so it can be assigned to global before any test file reads it
const nextRouterPushMock = jest.fn()
try {
  global.__mockNextPush = nextRouterPushMock
} catch (e) {
  // ignore
}

// Mock Next.js router and expose the push mock so tests can assert redirects
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: nextRouterPushMock,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    }),
  useSearchParams: () =>
    global.__testSearchParams instanceof URLSearchParams
      ? global.__testSearchParams
      : new URLSearchParams(),
  usePathname: () =>
    typeof global.__testPathname === 'string' ? global.__testPathname : '/',
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

// Provide a lightweight global Response polyfill for tests running under
// a Node environment where the Web/Fetch `Response` global is not defined.
// Some route handlers use `Response.redirect(...)` which exists in the
// runtime; tests can rely on this minimal shim to inspect `status` and
// `headers.get('location')`.
if (typeof global.Response === 'undefined') {
  class _MockResponse {
    status
    _body
    headers
    constructor(body = null, init = {}) {
      this._body = body
      this.status = init.status || 200
      // simple headers object with a get method used by tests
      this.headers = {
        get: (k) => null,
      }
    }

    static redirect(url, status = 302) {
        // url may be a URL instance or string
        const urlStr = url && url.toString ? url.toString() : String(url)
        const inst = new _MockResponse(null, { status })
        // override headers.get to return the absolute location
        inst.headers = {
          get: (k) => (k === 'location' ? urlStr : null),
        }
        return inst
    }

    async json() {
      return this._body
    }
  }

  // @ts-expect-error test-time polyfill replaces global Response in Jest
  global.Response = _MockResponse
}

// Mock environment variables for Supabase
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_KEY = 'test-service-key'
process.env.ESV_API_KEY = 'test-esv-key'
// Some code expects ESV API token to be in ESV_API_TOKEN; provide both for tests
process.env.ESV_API_TOKEN = process.env.ESV_API_TOKEN || process.env.ESV_API_KEY

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

// jsdom: `scrollIntoView` is missing or incomplete on some elements; memorization/reorder use it.
if (typeof HTMLElement !== 'undefined') {
  const proto = HTMLElement.prototype
  if (typeof proto.scrollIntoView !== 'function') {
    Object.defineProperty(proto, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: jest.fn(),
    })
  }
}

// JSDOM does not define `SpeechSynthesisUtterance`; memorization "Listen" uses TTS in tests.
if (typeof global.SpeechSynthesisUtterance === 'undefined') {
  global.SpeechSynthesisUtterance = class SpeechSynthesisUtterancePolyfill {
    constructor(text) {
      this.text = typeof text === 'string' ? text : ''
      this.lang = 'en-US'
      this.rate = 1
    }
  }
}

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

// jsdom only (node test environments have no MouseEvent / HTMLElement)
if (typeof MouseEvent !== 'undefined' && typeof global.PointerEvent === 'undefined') {
  global.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, params = {}) {
      super(type, params)
      this.pointerId = params.pointerId ?? 0
      this.pointerType = params.pointerType ?? ''
      this.width = params.width ?? 1
      this.height = params.height ?? 1
    }
  }
}

if (typeof HTMLElement !== 'undefined') {
  if (typeof HTMLElement.prototype.setPointerCapture === 'undefined') {
    HTMLElement.prototype.setPointerCapture = jest.fn()
  }
  if (typeof HTMLElement.prototype.releasePointerCapture === 'undefined') {
    HTMLElement.prototype.releasePointerCapture = jest.fn()
  }
  if (typeof HTMLElement.prototype.hasPointerCapture === 'undefined') {
    HTMLElement.prototype.hasPointerCapture = jest.fn(() => true)
  }
}

// jsdom does not implement ResizeObserver (used by ScripturePassageSwipeLayer and others)
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    constructor(callback) {
      this.callback = callback
    }

    observe(target) {
      if (target && typeof target.clientWidth === 'number') {
        this.callback([{ target }], this)
      }
    }

    disconnect() {}
  }
}

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
afterEach(async () => {
  jest.clearAllMocks()
  try {
    const { resetGospelClientStorageForTests } = require('@/lib/gospelClientStorage')
    const { deleteGospelIdbForTests } = require('@/lib/gospelClientKvStore')
    resetGospelClientStorageForTests()
    await deleteGospelIdbForTests()
  } catch {
    // ignore if storage modules are unavailable in a narrow test run
  }
  try {
    const { resetDocumentScrollLockForTests } = require('@/lib/documentScrollLock')
    resetDocumentScrollLockForTests()
  } catch {
    // ignore if scroll lock module is unavailable in a narrow test run
  }
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

// Provide a reusable, lightweight mock for the TipTap-based RichTextEditor
// used across admin pages. TipTap/ProseMirror relies on browser APIs that
// JSDOM doesn't fully implement, so tests should use this simple textarea
// implementation by default. Individual tests can still override this mock
// when they need to exercise editor behavior.
jest.mock('@/components/RichTextEditor', () => ({ __esModule: true, default: ({ value, onChange, placeholder = 'Click to edit...' }) => {
  const React = require('react')
  return React.createElement('textarea', {
    placeholder,
    value: value || '',
    onChange: (e) => onChange && onChange(e.target.value),
  })
} }))

// Provide a lightweight default mock for the TranslationContext used by many
// components. Tests that need specific behavior can still mock the module
// themselves or import the real provider. This prevents errors like
// "useTranslation must be used within a TranslationProvider" when tests
// render components that call useTranslation.
jest.mock('@/contexts/TranslationContext', () => {
  const React = require('react')
  const defaultContext = {
    translation: 'esv',
    setTranslation: jest.fn(),
    isLoading: false,
    enabledTranslations: ['esv', 'kjv', 'nasb', 'lsb', 'niv', 'nlt', 'csb'],
    enabledTranslationOptions: [
      { translation_code: 'esv', translation_name: 'ESV (English Standard Version)' },
      { translation_code: 'kjv', translation_name: 'KJV (King James Version)' },
      { translation_code: 'nasb', translation_name: 'NASB (New American Standard Bible)' },
      { translation_code: 'lsb', translation_name: 'LSB (Legacy Standard Bible)' },
      { translation_code: 'niv', translation_name: 'NIV (New International Version)' },
      { translation_code: 'nlt', translation_name: 'NLT (New Living Translation)' },
      { translation_code: 'csb', translation_name: 'CSB (Christian Standard Bible)' },
    ],
  }

  return {
    __esModule: true,
    // A no-op provider that simply renders children
    TranslationProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    // Hook used by components
    useTranslation: () => defaultContext,
    // Export the type-like constants for tests that import them
    BibleTranslation: {
      esv: 'esv',
      kjv: 'kjv',
      nasb: 'nasb',
      lsb: 'lsb'
    }
  }
})

// Mock AlertModalContext so components using useAlertModal() do not throw when
// rendered without AlertModalProvider. Expose mocks on global so tests can
// assert on showAlert/showConfirm (e.g. expect(global.__alertModalMocks.showAlert).toHaveBeenCalledWith('...')).
const alertModalMocks = {
  showAlert: jest.fn(),
  showConfirm: jest.fn(() => Promise.resolve(false))
}
global.__alertModalMocks = alertModalMocks
jest.mock('@/contexts/AlertModalContext', () => ({
  __esModule: true,
  AlertModalProvider: ({ children }) => children,
  useAlertModal: () => alertModalMocks
}))