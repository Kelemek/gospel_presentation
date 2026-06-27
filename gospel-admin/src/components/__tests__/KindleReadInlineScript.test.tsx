import { render } from '@testing-library/react'
import KindleReadInlineScript from '@/components/KindleReadInlineScript'

describe('KindleReadInlineScript', () => {
  it('renders an inline script with id and content in the HTML stream', () => {
    render(
      <KindleReadInlineScript scriptId="kindle-test" scriptContent="void 0;" />
    )
    const script = document.getElementById('kindle-test')
    expect(script?.tagName).toBe('SCRIPT')
    expect(script).toHaveTextContent('void 0;')
  })
})
