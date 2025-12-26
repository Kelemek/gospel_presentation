# E2E Tests with Playwright

This directory contains end-to-end tests for the Gospel Presentation Admin application using [Playwright](https://playwright.dev).

## Getting Started

### Installation

Playwright is already installed as a dev dependency. To install browsers:

```bash
npx playwright install
```

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test e2e/auth.spec.ts

# Run specific test by name
npx playwright test -g "should display login page"
```

## Test Structure

### Test Files

- **`auth.spec.ts`** - Authentication flow tests
  - Login page display
  - Verification code flow
  - Email validation
  - Logout functionality

- **`dashboard.spec.ts`** - Admin dashboard tests
  - Dashboard page layout
  - Profile list display
  - Create profile form
  - Profile metadata
  - View mode toggle

- **`access-control.spec.ts`** - Access control and security tests
  - Public profile access
  - Profile visibility settings
  - Admin route protection
  - CSRF protection
  - Scripture access control
  - Concurrent request handling

### Helpers

The `helpers.ts` file contains utility functions:

- `loginWithVerificationCode()` - Authenticate a user
- `logout()` - Log out a user
- `createProfile()` - Create a new profile
- `deleteProfile()` - Delete a profile
- `canAccessProfile()` - Check profile accessibility

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/path')
    
    // Perform actions
    await page.click('button')
    
    // Assert results
    await expect(page.locator('text=Success')).toBeVisible()
  })
})
```

### Best Practices

1. **Use meaningful test names** - Describe what the user does and what should happen
2. **Keep tests independent** - Don't rely on other tests' state
3. **Use test data constants** - Define test emails, codes at top of file
4. **Handle auth gracefully** - Tests may run against unauthenticated app
5. **Use helpers** - Reuse common actions via helpers.ts
6. **Avoid hard waits** - Use `waitForSelector`, `waitForURL` instead of `page.waitForTimeout()`

### Selectors

Good selector strategies (in order of preference):

```typescript
// 1. By text (most resilient to changes)
page.locator('button:has-text("Submit")')

// 2. By role (accessible, semantic)
page.locator('button[type="submit"]')

// 3. By test ID (if added to markup)
page.locator('[data-testid="submit-button"]')

// 4. By CSS class (less stable)
page.locator('.submit-button')
```

## Test Configuration

Configuration is in `playwright.config.ts`:

- **Browsers**: Tests run on Chromium, Firefox, and WebKit
- **Retries**: Failed tests retry in CI environments
- **Screenshots**: Captured on failure
- **Videos**: Recorded on failure
- **Traces**: Recorded on first retry for debugging

## Continuous Integration

E2E tests run in CI via `test:e2e` script. Configure in your CI/CD:

```bash
npm run test:e2e
```

Results are saved to:
- `test-results/` - JUnit XML for CI integration
- `playwright-report/` - HTML report
- Logs available in CI artifacts

## Debugging

### UI Mode

Interactive test debugging:

```bash
npm run test:e2e:ui
```

### Debug Mode

Step through tests:

```bash
npm run test:e2e:debug
```

### Headed Mode

See actual browser while tests run:

```bash
npm run test:e2e:headed
```

### View Test Report

```bash
npx playwright show-report
```

## Common Issues

### Port Already in Use

If port 3000 is in use:

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or configure different port in playwright.config.ts
```

### Browser Download Failed

```bash
npx playwright install --with-deps
```

### Tests Timing Out

- Increase timeout in playwright.config.ts
- Check if app is running: `npm run dev`
- Look at test report for which step failed

### Flaky Tests

- Use proper waits instead of `waitForTimeout`
- Avoid racing conditions with `waitForNavigation`
- Use `waitForLoadState('networkidle')`

## Test Data

For now, tests are written to work against any state. In the future, consider:

- Test database with known profiles
- API fixtures for authentication
- Page object models for complex flows
- Mock API responses for edge cases

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Report Viewer](https://playwright.dev/docs/test-reporters)
- [Debugging Guide](https://playwright.dev/docs/debug)
