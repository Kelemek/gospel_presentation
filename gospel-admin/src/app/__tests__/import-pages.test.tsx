import AdminPage from '../admin/page'
import ProfileContent from '../[slug]/ProfileContent'
import SlugPage from '../[slug]/page'

describe('import large app pages', () => {
  test('admin page exports a component', () => {
    expect(typeof AdminPage).toBe('function')
  })

  test('ProfileContent module exports a function', () => {
    expect(typeof ProfileContent).toBe('function')
  })

  test('[slug] page module exports (server component)', () => {
    expect(typeof SlugPage).toBe('function')
  })
})
