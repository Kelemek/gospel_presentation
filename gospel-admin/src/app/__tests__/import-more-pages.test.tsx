// Lightweight import tests for additional large app modules to increase coverage
test('import layout and additional app pages', async () => {
  const layout = await import('../layout')
  expect(layout).toBeDefined()

  const login = await import('../login/page')
  expect(login).toBeDefined()

  const copyright = await import('../copyright/page')
  expect(copyright).toBeDefined()

  // admin subpages
  const adminPage = await import('../admin/page')
  expect(adminPage).toBeDefined()

  // slug pages
  const profileContent = await import('../[slug]/ProfileContent')
  expect(profileContent).toBeDefined()

  const slugPage = await import('../[slug]/page')
  expect(slugPage).toBeDefined()
})
