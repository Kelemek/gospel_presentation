import React from 'react'
import { render } from '@testing-library/react'

function getDispatcher() {
  // Access React internals where possible for debugging
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const internals: any = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
  if (!internals) return null
  return internals.ReactCurrentDispatcher && internals.ReactCurrentDispatcher.current
}

describe('AdminPageContent import/render diagnostics', () => {
  test.skip('require() import then render should not throw', () => {
    jest.isolateModules(() => {
      // Require the module fresh and render
      // eslint-disable-next-line global-require
      const mod = require('@/app/admin/page')
      const AdminPageContent = mod && mod.AdminPageContent
      // Log dispatcher value before render
      // eslint-disable-next-line no-console
      console.log('dispatcher before require render ->', !!getDispatcher())
      expect(typeof AdminPageContent).toBe('function')
      render(React.createElement(AdminPageContent))
      // eslint-disable-next-line no-console
      console.log('dispatcher after require render ->', !!getDispatcher())
    })
  })

  test.skip('dynamic import then render should not throw', async () => {
    jest.isolateModules(async () => {
      const mod = await import('@/app/admin/page')
      const AdminPageContent = mod && mod.AdminPageContent
      // eslint-disable-next-line no-console
      console.log('dispatcher before import render ->', !!getDispatcher())
      expect(typeof AdminPageContent).toBe('function')
      render(React.createElement(AdminPageContent))
      // eslint-disable-next-line no-console
      console.log('dispatcher after import render ->', !!getDispatcher())
    })
  })
})
