import { test, expect, Page } from '@playwright/test'

/**
 * Shared test utilities and fixtures
 */

export const ADMIN_EMAIL = 'admin@example.com'
export const COUNSELOR_EMAIL = 'counselor@example.com'
export const COUNSELEE_EMAIL = 'counselee@example.com'
export const TEST_CODE = '123456'

/**
 * Login with verification code flow
 * This is the primary auth mechanism for the app
 */
export async function loginWithVerificationCode(
  page: Page,
  email: string,
  code: string = TEST_CODE
) {
  await page.goto('/login')
  
  // Enter email
  await page.fill('input[type="email"]', email)
  
  // Click send code button
  await page.click('button:has-text("Send Code")')
  
  // Wait for code input to appear
  await page.waitForSelector('input[placeholder*="digit"]')
  
  // Enter verification code
  await page.fill('input[placeholder*="digit"]', code)
  
  // Wait for redirect to dashboard or appropriate page
  await page.waitForURL(/\/(admin|$)/)
}

/**
 * Logout user
 */
export async function logout(page: Page) {
  // Click logout button (usually in header)
  const logoutButton = page.locator('button:has-text("Logout")')
  
  if (await logoutButton.isVisible()) {
    await logoutButton.click()
  } else {
    // Try menu if exists
    const menuButton = page.locator('button[aria-label*="menu" i]')
    if (await menuButton.isVisible()) {
      await menuButton.click()
      await page.click('button:has-text("Logout")')
    }
  }
  
  // Should redirect to login
  await page.waitForURL('/login')
}

/**
 * Create a new profile
 */
export async function createProfile(
  page: Page,
  title: string,
  description: string = ''
) {
  // Click create profile button
  await page.click('button:has-text("Create")')
  
  // Fill in profile details
  await page.fill('input[name="title"]', title)
  
  if (description) {
    await page.fill('textarea[name="description"]', description)
  }
  
  // Submit form
  await page.click('button:has-text("Create")')
  
  // Wait for profile to appear in list
  await page.waitForSelector(`text=${title}`)
}

/**
 * Delete a profile
 */
export async function deleteProfile(page: Page, profileTitle: string) {
  // Find profile row and expand it
  const profileRow = page.locator(`text=${profileTitle}`)
  await profileRow.click()
  
  // Click delete button
  await page.click('button:has-text("Delete")')
  
  // Confirm deletion
  await page.on('dialog', (dialog: any) => {
    dialog.accept()
  })
  
  // Wait for profile to disappear
  await page.waitForSelector(`text=${profileTitle}`, { state: 'hidden' })
}

/**
 * Check if user can access a profile
 */
export async function canAccessProfile(
  page: Page,
  profileSlug: string
): Promise<boolean> {
  try {
    await page.goto(`/${profileSlug}`)
    // Check if we get content or 404/access denied
    const content = page.locator('main, [role="main"]')
    return await content.isVisible()
  } catch {
    return false
  }
}
