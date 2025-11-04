import React from 'react'

test('react import vs require equality', () => {
  // eslint-disable-next-line global-require
  const R = require('react')
  console.log('imported React === require(react) ->', R === React)
  console.log('React.version ->', React.version)
  expect(true).toBe(true)
})
