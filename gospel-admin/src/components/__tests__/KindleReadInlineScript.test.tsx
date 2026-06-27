import { render } from '@testing-library/react'
import KindleReadInlineScript from '@/components/KindleReadInlineScript'

jest.mock('next/navigation', () => ({
  useServerInsertedHTML: jest.fn(),
}))

import { useServerInsertedHTML } from 'next/navigation'

const mockUseServerInsertedHTML = useServerInsertedHTML as jest.Mock

describe('KindleReadInlineScript', () => {
  beforeEach(() => {
    mockUseServerInsertedHTML.mockClear()
  })

  it('registers SSR injection and renders nothing in the React tree', () => {
    const { container } = render(
      <KindleReadInlineScript scriptId="kindle-test" scriptContent="void 0;" />
    )
    expect(mockUseServerInsertedHTML).toHaveBeenCalledTimes(1)
    expect(container).toBeEmptyDOMElement()
  })
})
