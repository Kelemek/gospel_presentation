import React from 'react'
import { render } from '@testing-library/react'

test('react hooks sanity check (import-only)', () => {
  jest.resetModules()

  console.log('React.version ->', React.version)

  function Foo() {
    const [n] = React.useState(0)
    return <div>{`n:${n}`}</div>
  }

  render(<Foo />)
  expect(true).toBe(true)
})
