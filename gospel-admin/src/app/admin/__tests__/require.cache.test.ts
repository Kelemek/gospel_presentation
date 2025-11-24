test('print require.cache entries for react/react-dom after importing admin page', () => {
   
  console.log('react resolved ->', require.resolve('react'))
   
  console.log('react-dom resolved ->', require.resolve('react-dom'))

   
  jest.isolateModules(() => { require('../page') })

  const keys = Object.keys(require.cache || {})
  const matches = keys.filter(k => k.includes('node_modules/react') || k.includes('node_modules/react-dom'))
   
  console.log('require.cache matches:', matches)
  expect(true).toBe(true)
})
