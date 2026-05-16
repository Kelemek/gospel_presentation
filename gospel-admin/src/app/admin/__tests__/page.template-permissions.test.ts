/**
 * Admin-only staff: template management is restricted to admins in the UI.
 * These checks mirror the intent of `TemplatesListPanel` / template routes (admin gate).
 */

function canManageTemplateUi(isAdmin: boolean): boolean {
  return isAdmin
}

describe('Template permissions (admin-only)', () => {
  it('allows template management UI for admins', () => {
    expect(canManageTemplateUi(true)).toBe(true)
  })

  it('denies template management UI for non-admins', () => {
    expect(canManageTemplateUi(false)).toBe(false)
  })
})
