test('print require.cache entries for react/react-dom after importing admin page', () => {
  // eslint-disable-next-line no-console
  console.log('react resolved ->', require.resolve('react'))
  // eslint-disable-next-line no-console
  console.log('react-dom resolved ->', require.resolve('react-dom'))

  // eslint-disable-next-line global-require
  jest.isolateModules(() => { require('../page') })

  const keys = Object.keys(require.cache || {})
  const matches = keys.filter(k => k.includes('node_modules/react') || k.includes('node_modules/react-dom'))
  // eslint-disable-next-line no-console
  console.log('require.cache matches:', matches)
  expect(true).toBe(true)
})
