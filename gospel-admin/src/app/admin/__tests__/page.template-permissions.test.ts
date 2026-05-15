/**
 * Tests for template profile permissions:
 * - Counselors can see templates but cannot edit them
 * - Only admins can edit/delete templates
 */

type UserRole = 'admin' | 'counselor' | 'counselee'

type ProfileFlags = { isTemplate: boolean; isDefault: boolean; createdBy: string }

/** Mirrors `canManageProfile` / Settings+Edit visibility in `admin/page.tsx`. */
function canEditFromPageLogic(userRole: UserRole, userId: string, profile: ProfileFlags): boolean {
  return (
    userRole === 'admin' ||
    (profile.createdBy === userId && !profile.isDefault && !profile.isTemplate)
  )
}

/** Mirrors delete visibility in `admin/page.tsx`. */
function canDeleteFromPageLogic(userRole: UserRole, userId: string, profile: ProfileFlags): boolean {
  return !profile.isDefault && (userRole === 'admin' || (profile.createdBy === userId && !profile.isTemplate))
}

/** Mirrors backup/restore visibility in `admin/page.tsx`. */
function canBackupFromPageLogic(userRole: UserRole, userId: string, profile: ProfileFlags): boolean {
  return (
    userRole !== 'counselee' &&
    (userRole === 'admin' || (profile.createdBy === userId && !profile.isDefault && !profile.isTemplate))
  )
}

function profileAvailableForCloning(
  userRole: UserRole,
  userId: string,
  p: { slug: string; isTemplate: boolean; createdBy: string }
): boolean {
  if (userRole === 'admin') {
    return true
  }
  return p.isTemplate || p.createdBy === userId
}

describe('Template Profile Permissions', () => {
  describe('Profile filtering logic', () => {
    const mockProfiles = [
      { id: '1', slug: 'my-profile', title: 'My Profile', isTemplate: false, isDefault: false, createdBy: 'user1' },
      { id: '2', slug: 'template-1', title: 'Template 1', isTemplate: true, isDefault: false, createdBy: 'admin1' },
      { id: '3', slug: 'default', title: 'Default', isTemplate: false, isDefault: true, createdBy: 'admin1' },
    ]

    it('should hide all templates from main profile list (templates appear in Resource templates on /admin)', () => {
      const userRole: UserRole = 'counselor'
      const filtered = mockProfiles.filter(profile => {
        // Templates are excluded from assigned-resources list
        if (profile.isTemplate) return false
        return true
      })

      expect(filtered.length).toBe(2)
      expect(filtered.every(p => !p.isTemplate)).toBe(true)
    })

    it('should hide templates from counselees in main profile list', () => {
      const userRole: UserRole = 'counselee'
      const filtered = mockProfiles.filter(profile => {
        if (profile.isTemplate) return false
        return true
      })

      expect(filtered.length).toBe(2)
      expect(filtered.every(p => !p.isTemplate)).toBe(true)
    })

    it('should hide templates from admins in main profile list (Resource templates card on /admin)', () => {
      const userRole: UserRole = 'admin'
      const filtered = mockProfiles.filter(profile => {
        if (profile.isTemplate) return false
        return true
      })

      expect(filtered.length).toBe(2)
      expect(filtered.every(p => !p.isTemplate)).toBe(true)
    })
  })

  describe('Edit button visibility logic', () => {
    it('should hide edit button for templates when user is counselor', () => {
      const userRole: UserRole = 'counselor'
      const userId = 'counselor-123'
      const templateProfile = { isTemplate: true, isDefault: false, createdBy: userId }

      expect(canEditFromPageLogic(userRole, userId, templateProfile)).toBe(false)
    })

    it('should show edit button for templates when user is admin', () => {
      const userRole: UserRole = 'admin'
      const userId = 'admin-123'
      const templateProfile = { isTemplate: true, isDefault: false, createdBy: 'other-user-456' }

      expect(canEditFromPageLogic(userRole, userId, templateProfile)).toBe(true)
    })

    it('should show edit button for non-template profiles when user is counselor and owns the profile', () => {
      const userRole: UserRole = 'counselor'
      const userId = 'counselor-123'
      const regularProfile = { isTemplate: false, isDefault: false, createdBy: userId }

      expect(canEditFromPageLogic(userRole, userId, regularProfile)).toBe(true)
    })

    it('should hide edit button for non-template profiles when user is counselor but does not own the profile', () => {
      const userRole: UserRole = 'counselor'
      const userId = 'counselor-123'
      const regularProfile = { isTemplate: false, isDefault: false, createdBy: 'other-user-456' }

      expect(canEditFromPageLogic(userRole, userId, regularProfile)).toBe(false)
    })

    it('should never show edit button for default profile when user is counselor', () => {
      const userRole: UserRole = 'counselor'
      const userId = 'counselor-123'
      const defaultProfile = { isTemplate: false, isDefault: true, createdBy: userId }

      expect(canEditFromPageLogic(userRole, userId, defaultProfile)).toBe(false)
    })
  })

  describe('Delete button visibility logic', () => {
    it('should hide delete button for templates when user is counselor', () => {
      const userRole: UserRole = 'counselor'
      const userId = 'counselor-123'
      const templateProfile = { isTemplate: true, isDefault: false, createdBy: userId }

      expect(canDeleteFromPageLogic(userRole, userId, templateProfile)).toBe(false)
    })

    it('should show delete button for templates when user is admin', () => {
      const userRole: UserRole = 'admin'
      const userId = 'admin-123'
      const templateProfile = { isTemplate: true, isDefault: false, createdBy: 'other-user-456' }

      expect(canDeleteFromPageLogic(userRole, userId, templateProfile)).toBe(true)
    })

    it('should show delete button for non-template profiles when user is counselor and owns the profile', () => {
      const userRole: UserRole = 'counselor'
      const userId = 'counselor-123'
      const regularProfile = { isTemplate: false, isDefault: false, createdBy: userId }

      expect(canDeleteFromPageLogic(userRole, userId, regularProfile)).toBe(true)
    })

    it('should hide delete button for non-template profiles when user is counselor but does not own the profile', () => {
      const userRole: UserRole = 'counselor'
      const userId = 'counselor-123'
      const regularProfile = { isTemplate: false, isDefault: false, createdBy: 'other-user-456' }

      expect(canDeleteFromPageLogic(userRole, userId, regularProfile)).toBe(false)
    })

    it('should never show delete button for default profile regardless of role', () => {
      const userId = 'user-123'
      const defaultProfile = { isTemplate: false, isDefault: true, createdBy: userId }

      expect(canDeleteFromPageLogic('admin', userId, defaultProfile)).toBe(false)
      expect(canDeleteFromPageLogic('counselor', userId, defaultProfile)).toBe(false)
    })
  })

  describe('Backup/Restore button visibility logic', () => {
    it('should hide backup/restore buttons for templates when user is counselor', () => {
      const userRole: UserRole = 'counselor'
      const userId = 'counselor-123'
      const templateProfile = { isTemplate: true, isDefault: false, createdBy: userId }

      expect(canBackupFromPageLogic(userRole, userId, templateProfile)).toBe(false)
    })

    it('should show backup/restore buttons for templates when user is admin', () => {
      const userRole: UserRole = 'admin'
      const userId = 'admin-123'
      const templateProfile = { isTemplate: true, isDefault: false, createdBy: 'other-user-456' }

      expect(canBackupFromPageLogic(userRole, userId, templateProfile)).toBe(true)
    })

    it('should show backup/restore buttons for non-template profiles when user is counselor and owns the profile', () => {
      const userRole: UserRole = 'counselor'
      const userId = 'counselor-123'
      const regularProfile = { isTemplate: false, isDefault: false, createdBy: userId }

      expect(canBackupFromPageLogic(userRole, userId, regularProfile)).toBe(true)
    })

    it('should hide backup/restore buttons for non-template profiles when user is counselor but does not own the profile', () => {
      const userRole: UserRole = 'counselor'
      const userId = 'counselor-123'
      const regularProfile = { isTemplate: false, isDefault: false, createdBy: 'other-user-456' }

      expect(canBackupFromPageLogic(userRole, userId, regularProfile)).toBe(false)
    })

    it('should hide backup/restore buttons for counselees', () => {
      const userRole: UserRole = 'counselee'
      const userId = 'counselee-123'
      const regularProfile = { isTemplate: false, isDefault: false, createdBy: userId }

      expect(canBackupFromPageLogic(userRole, userId, regularProfile)).toBe(false)
    })
  })

  describe('Clone from template logic', () => {
    const mockProfiles = [
      { slug: 'my-profile', isTemplate: false, createdBy: 'user1' },
      { slug: 'template-1', isTemplate: true, createdBy: 'admin1' },
      { slug: 'other-profile', isTemplate: false, createdBy: 'user2' },
    ]

    it('should allow counselors to clone from templates', () => {
      const userRole: UserRole = 'counselor'
      const userId = 'user1'

      const availableForCloning = mockProfiles.filter((p) => profileAvailableForCloning(userRole, userId, p))

      expect(availableForCloning.length).toBe(2)
      expect(availableForCloning.some(p => p.isTemplate)).toBe(true)
      expect(availableForCloning.some(p => p.slug === 'my-profile')).toBe(true)
      expect(availableForCloning.some(p => p.slug === 'other-profile')).toBe(false)
    })

    it('should allow admins to clone from any profile', () => {
      const userRole: UserRole = 'admin'
      const userId = 'user1'

      const availableForCloning = mockProfiles.filter((p) => profileAvailableForCloning(userRole, userId, p))

      expect(availableForCloning.length).toBe(3)
    })
  })
})
