import * as auth from '../auth'

describe('auth shim', () => {
  test('default exports and functions', async () => {
    expect(auth.isAuthenticated()).toBe(false)
    const a = await auth.authenticate()
    expect(a).toEqual({ success: false })
    const l = await auth.logout()
    expect(l).toEqual({ success: true })
    expect(auth.getAuthStatus()).toEqual({ isAuthenticated: false })
    expect(auth.getSessionToken()).toBeNull()
    // default export should include the functions
    expect(typeof auth.default.isAuthenticated).toBe('function')
  })
})
