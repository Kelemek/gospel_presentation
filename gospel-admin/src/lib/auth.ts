// Lightweight auth shim to satisfy imports during tests.
// Production auth is handled elsewhere (e.g., Supabase); this file provides
// minimal exports so tests and mocks can import the module reliably.

export const isAuthenticated = (): boolean => {
  return false
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const authenticate = async (_password?: string) => {
  return false
}

export const logout = async () => {
  return { success: true }
}

export const getAuthStatus = () => {
  return { isAuthenticated: false }
}

export const getSessionToken = (): string | null => {
  return null
}

const authModule = {
  isAuthenticated,
  authenticate,
  logout,
  getAuthStatus,
  getSessionToken,
}

export default authModule
