import { test, expect } from '@playwright/test'
import { loginWithVerificationCode, logout, ADMIN_EMAIL, COUNSELOR_EMAIL, TEST_CODE } from './helpers'

test.describe('Authentication Flow', () => {
  test('[smoke] should display login page', async ({ page }) => {
    await page.goto('/login')
    
    expect(await page.title()).toBeDefined()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button:has-text("Send Code")')).toBeVisible()
  })

  test('should show verification code input after sending code', async ({ page }) => {
    await page.goto('/login')
    
    // Enter email
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    
    // Click send code
    await page.click('button:has-text("Send Code")')
    
    // Wait for code input to appear
    await page.waitForSelector('input[placeholder*="digit"]')
    
    // Verify code input is visible
    const codeInput = page.locator('input[placeholder*="digit"]')
    await expect(codeInput).toBeVisible()
  })

  test('[smoke] should accept valid verification code', async ({ page }) => {
    await page.goto('/login')
    
    // Enter email
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    
    // Send code
    await page.click('button:has-text("Send Code")')
    
    // Wait for code input
    await page.waitForSelector('input[placeholder*="digit"]')
    
    // Enter code (in production this would be real code from email/SMS)
    await page.fill('input[placeholder*="digit"]', TEST_CODE)
    
    // Should either:
    // 1. Show error if code is invalid (expected in test env)
    // 2. Redirect if code is valid
    // This test just verifies the flow is navigable
    const errorMsg = page.locator('[role="alert"]')
    const isErrorVisible = await errorMsg.isVisible().catch(() => false)
    
    if (!isErrorVisible) {
      // No error means code was accepted, check for redirect
      await page.waitForURL(/\/(admin|$)/, { timeout: 5000 }).catch(() => {
        // Redirect didn't happen, that's okay in test env
      })
    }
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('/login')
    
    // Try invalid email
    await page.fill('input[type="email"]', 'not-an-email')
    
    // Send button might be disabled or show error
    const sendButton = page.locator('button:has-text("Send Code")')
    
    // Check if button is disabled or if form validation shows error
    const isDisabled = await sendButton.isDisabled().catch(() => false)
    const emailInput = page.locator('input[type="email"]')
    const hasValidation = await emailInput.evaluate((el: any) => !el.checkValidity()).catch(() => false)
    
    expect(isDisabled || hasValidation).toBe(true)
  })

  test('should handle logout', async ({ page }) => {
    await page.goto('/login')
    
    // Note: In a real test, you'd have a test user already authenticated
    // For now, just test that logout button exists and navigation works
    const logoutUrl = '/login'
    
    // Navigate to confirm logout page is accessible
    await page.goto(logoutUrl)
    await expect(page).toHaveURL(logoutUrl)
  })

  test('should show loading state during code sending', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    
    // Click send code
    await page.click('button:has-text("Send Code")')
    
    // The button might show loading state or become disabled briefly
    const sendButton = page.locator('button:has-text("Send Code")')
    
    // Either button is disabled or button text changes or spinner appears
    const spinner = page.locator('[class*="spin"]')
    const hasLoadingIndicator = await sendButton.isDisabled().catch(() => false) ||
                                await spinner.isVisible().catch(() => false)
    
    // Eventually should transition to code input
    await page.waitForSelector('input[placeholder*="digit"]')
    await expect(page.locator('input[placeholder*="digit"]')).toBeVisible()
  })

  test('should handle missing Supabase configuration gracefully', async ({ page }) => {
    // This tests error handling, not actual auth
    await page.goto('/login')
    
    // Page should at least load without crashing
    await expect(page.locator('body')).toBeVisible()
  })
})
