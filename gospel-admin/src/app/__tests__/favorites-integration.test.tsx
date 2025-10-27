// Tests removed: favorites integration tests depended on old routing and complex
// integration behavior. Removed per maintainer request. If you want these
// integration checks re-added, consider either (1) targeting the current
// `/default` route in tests, or (2) exporting the inner presentation component
// from `src/app/page.tsx` so the UI can be exercised directly without router redirects.

// Include a skipped placeholder test so Jest treats this as a valid test file
// (prevents "Your test suite must contain at least one test" failures).
test.skip('placeholder - favorites integration tests removed (see README)', () => {
  // intentionally empty
});
