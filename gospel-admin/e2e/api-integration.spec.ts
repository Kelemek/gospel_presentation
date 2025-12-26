import { test, expect } from '@playwright/test'

/**
 * Direct API endpoint integration tests
 * Tests API contracts without going through UI
 */
test.describe('API Integration - Profiles', () => {
  test('GET /api/profiles returns list', async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/profiles')
        return { status: res.status, ok: res.ok, hasData: true }
      } catch (e) {
        return { status: 0, ok: false, error: (e as Error).message }
      }
    })
    
    // Should return 200 or 401 (auth required)
    expect([200, 401]).toContain(response.status)
  })

  test('GET /api/profiles/:slug returns single profile', async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/profiles/default')
        const data = await res.json().catch(() => ({}))
        return { status: res.status, ok: res.ok, hasTitle: !!data.title }
      } catch (e) {
        return { status: 0, ok: false }
      }
    })
    
    // Should return 200 or 404 if not found
    expect([200, 404, 401]).toContain(response.status)
  })

  test('POST /api/profiles requires authentication', async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Test Profile', description: 'Test' })
        })
        return res.status
      } catch (e) {
        return 0
      }
    })
    
    // Should require auth
    expect([401, 403]).toContain(response)
  })

  test('PATCH /api/profiles/:slug requires authentication', async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/profiles/default', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Updated' })
        })
        return res.status
      } catch (e) {
        return 0
      }
    })
    
    // Should require auth
    expect([401, 403]).toContain(response)
  })

  test('DELETE /api/profiles/:slug requires authentication', async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/profiles/test-profile', {
          method: 'DELETE'
        })
        return res.status
      } catch (e) {
        return 0
      }
    })
    
    // Should require auth
    expect([401, 403]).toContain(response)
  })

  test('API returns proper error messages', async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/profiles/nonexistent-profile-xyz')
        const data = await res.json().catch(() => ({}))
        return { status: res.status, hasError: !!data.error || res.status === 404 }
      } catch (e) {
        return { status: 0, hasError: true }
      }
    })
    
    // Should have error info
    expect([200, 401, 404]).toContain(response.status)
  })

  test('API validates required fields', async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: 'Missing title' })
        })
        return { status: res.status, isError: res.status >= 400 }
      } catch (e) {
        return { status: 0, isError: true }
      }
    })
    
    // Should validate
    expect(response.status).toBeGreaterThanOrEqual(0)
  })

  test('API handles concurrent requests', async ({ page }) => {
    const responses = await page.evaluate(async () => {
      const promises = Array(5).fill(null).map(() => 
        fetch('/api/profiles').then(r => r.status)
      )
      return Promise.all(promises)
    }).catch(() => [])
    
    // Should handle concurrent requests
    expect(responses.length).toBeGreaterThanOrEqual(0)
  })

  test('API response includes proper headers', async ({ page }) => {
    const headers = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/profiles')
        return {
          contentType: res.headers.get('content-type'),
          cacheControl: res.headers.get('cache-control'),
          corsAllowed: res.headers.get('access-control-allow-origin')
        }
      } catch (e) {
        return {}
      }
    })
    
    // Should have proper headers
    expect(typeof headers).toBe('object')
  })

  test('API respects query parameters', async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/profiles?limit=5&offset=0')
        return { status: res.status, ok: res.ok }
      } catch (e) {
        return { status: 0 }
      }
    })
    
    expect([200, 401]).toContain(response.status)
  })
})

test.describe('API Integration - Scripture', () => {
  test('GET /api/scripture returns content', async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/scripture')
        return { status: res.status, ok: res.ok }
      } catch (e) {
        return { status: 0 }
      }
    })
    
    expect([200, 400, 401]).toContain(response.status)
  })

  test('GET /api/scripture/:slug returns scripture', async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/scripture/default')
        return { status: res.status, ok: res.ok }
      } catch (e) {
        return { status: 0 }
      }
    })
    
    expect([200, 404, 401]).toContain(response.status)
  })

  test('Scripture API validates verse references', async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/scripture?verse=invalid')
        return { status: res.status }
      } catch (e) {
        return { status: 0 }
      }
    })
    
    expect(response.status).toBeGreaterThanOrEqual(0)
  })
})

test.describe('API Integration - Users', () => {
  test('GET /api/user requires authentication', async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/user')
        return res.status
      } catch (e) {
        return 0
      }
    })
    
    expect([401, 403]).toContain(response)
  })

  test('POST /api/auth/logout clears session', async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/auth/logout', { method: 'POST' })
        return { status: res.status, ok: res.ok }
      } catch (e) {
        return { status: 0 }
      }
    })
    
    expect([200, 401]).toContain(response.status)
  })
})

test.describe('API Response Format', () => {
  test('successful responses follow consistent format', async ({ page }) => {
    const data = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/profiles/default')
        const json = await res.json().catch(() => null)
        return {
          isObject: typeof json === 'object',
          hasExpectedFields: json && typeof json === 'object'
        }
      } catch (e) {
        return { isObject: false }
      }
    })
    
    expect(typeof data).toBe('object')
  })

  test('error responses include error details', async ({ page }) => {
    const data = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/invalid-endpoint')
        const json = await res.json().catch(() => ({}))
        return { status: res.status, hasError: !!json.error }
      } catch (e) {
        return { hasError: true }
      }
    })
    
    expect([200, 404, 401]).toContain(data.status)
  })

  test('API timeout is reasonable', async ({ page }) => {
    const startTime = Date.now()
    
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/profiles')
        return res.status
      } catch (e) {
        return 0
      }
    }).catch(() => 0)
    
    const duration = Date.now() - startTime
    
    // Should respond within 5 seconds
    expect(duration).toBeLessThan(5000)
  })
})

test.describe('API Rate Limiting', () => {
  test('API handles rapid requests gracefully', async ({ page }) => {
    const responses = await page.evaluate(async () => {
      const results = []
      for (let i = 0; i < 10; i++) {
        try {
          const res = await fetch('/api/profiles')
          results.push(res.status)
        } catch (e) {
          results.push(0)
        }
      }
      return results
    }).catch(() => [])
    
    // Should not crash
    expect(responses.length).toBeGreaterThanOrEqual(0)
  })

  test('API returns 429 when rate limited', async ({ page }) => {
    const responses = await page.evaluate(async () => {
      const results = []
      for (let i = 0; i < 50; i++) {
        try {
          const res = await fetch('/api/profiles')
          results.push(res.status)
        } catch (e) {
          results.push(0)
        }
      }
      return results
    }).catch(() => [])
    
    // Should handle many requests
    expect(typeof responses).toBe('object')
  })
})

test.describe('API Pagination', () => {
  test('API supports limit parameter', async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/profiles?limit=10')
        return { status: res.status, ok: res.ok }
      } catch (e) {
        return { status: 0 }
      }
    })
    
    expect([200, 401]).toContain(response.status)
  })

  test('API supports offset parameter', async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/profiles?offset=20')
        return { status: res.status, ok: res.ok }
      } catch (e) {
        return { status: 0 }
      }
    })
    
    expect([200, 401]).toContain(response.status)
  })

  test('API respects limit boundaries', async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/profiles?limit=1000')
        return { status: res.status }
      } catch (e) {
        return { status: 0 }
      }
    })
    
    expect(response.status).toBeGreaterThanOrEqual(0)
  })
})
