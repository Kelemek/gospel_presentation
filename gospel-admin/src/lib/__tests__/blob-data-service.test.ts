import { 
  getProfiles, 
  getProfileBySlug, 
  updateProfile, 
  incrementProfileVisitCount,
  createProfile,
  loadProfiles,
  saveProfiles
} from '../blob-data-service'
import { GospelProfile } from '../types'

// Mock Netlify Blob Store
jest.mock('@netlify/blobs', () => ({
  getStore: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    // provide setJSON alias used by production code
    setJSON: jest.fn(),
    list: jest.fn(),
    delete: jest.fn()
  }))
}))

const mockStore = {
  get: jest.fn(),
  set: jest.fn(),
  setJSON: jest.fn(),
  list: jest.fn(),
  delete: jest.fn()
}

// Mock the getStore function to return our mock
const { getStore } = require('@netlify/blobs')
getStore.mockReturnValue(mockStore)

// Skip Blob Data Service tests for now — they depend on Netlify blob behavior
// and several tests are brittle due to production API changes (setJSON vs set).
describe('Blob Data Service', () => {
  const mockProfile: GospelProfile = {
    id: '1',
    slug: 'test-profile',
    title: 'Test Profile',
    description: 'Test description',
    gospelData: [],
    isDefault: false,
    visitCount: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  }

  const mockProfilesData = {
    profiles: [mockProfile]
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset console.log mock
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getProfiles', () => {
    it('should fetch profiles from blob storage successfully', async () => {
  mockStore.get.mockResolvedValue(mockProfilesData)

      const result = await getProfiles()

  expect(mockStore.get).toHaveBeenCalledWith('profiles.json', { type: 'json' })
      expect(result).toHaveLength(1)
      expect(result[0].slug).toBe('test-profile')
    })

    it('should handle missing profiles blob by creating default profile', async () => {
      mockStore.get.mockResolvedValue(null)

      const result = await getProfiles()

      // When no profiles exist in blob storage, loadProfiles should create
      // and return an initial storage containing the default profile.
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result[0].slug).toBe('default')
    })

    it('should handle blob storage errors gracefully and return default storage', async () => {
      mockStore.get.mockRejectedValue(new Error('Blob storage error'))

      const result = await getProfiles()

      // On errors reading from blob storage, loadProfiles falls back to
      // creating and returning a default profile storage.
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThanOrEqual(1)
      // The service logs the blob access error; ensure we called console.log
      expect(console.log).toHaveBeenCalled()
    })
  })

  describe('incrementProfileVisitCount', () => {
    it('should increment visit count and update lastVisited', async () => {
      const profileWithVisits = {
        ...mockProfile,
        visitCount: 5
      }
      const profilesData = { 
        profiles: [profileWithVisits],
        nextId: 2,
        lastModified: new Date().toISOString()
      }

  mockStore.get.mockResolvedValue(profilesData)
  mockStore.setJSON.mockResolvedValue(undefined)

  await expect(incrementProfileVisitCount('test-profile')).resolves.not.toThrow()

  expect(mockStore.setJSON).toHaveBeenCalled()
      
  // Check the saved data includes incremented count and lastVisited
  const savedData = mockStore.setJSON.mock.calls[0][1]
  const updatedProfile = savedData.profiles[0]
      
  expect(updatedProfile.visitCount).toBe(6)
  expect(updatedProfile.lastVisited).toBeDefined()
    })

    it('should handle profile not found gracefully', async () => {
      mockStore.get.mockResolvedValue({ 
        profiles: [],
        nextId: 1,
        lastModified: new Date().toISOString()
      })

      await expect(incrementProfileVisitCount('nonexistent-profile')).resolves.not.toThrow()
      
  // Current implementation does not save when profile not found,
  // so ensure setJSON was not called.
  expect(mockStore.setJSON).not.toHaveBeenCalled()
    })

    it('should handle blob storage errors', async () => {
      mockStore.get.mockRejectedValue(new Error('Blob storage error'))

      await expect(incrementProfileVisitCount('test-profile')).resolves.not.toThrow()
    })
  })

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const profilesData = {
        profiles: [mockProfile],
        nextId: 2,
        lastModified: new Date().toISOString()
      }
      
  mockStore.get.mockResolvedValue(profilesData)
  mockStore.setJSON.mockResolvedValue(undefined)

      const updatedProfile = { ...mockProfile, title: 'Updated Title' }
      await expect(updateProfile(updatedProfile.slug, updatedProfile)).resolves.not.toThrow()

  expect(mockStore.setJSON).toHaveBeenCalled()
    })

    it('should handle save errors', async () => {
      const profilesData = {
        profiles: [mockProfile],
        nextId: 2,
        lastModified: new Date().toISOString()
      }
      
  mockStore.get.mockResolvedValue(profilesData)
  mockStore.setJSON.mockRejectedValue(new Error('Save error'))

  // saveProfiles wraps underlying errors and throws a generic message
  await expect(updateProfile(mockProfile.slug, mockProfile)).rejects.toThrow('Failed to save profiles to blob storage')
    })
  })

  describe('createProfile', () => {
    const createProfileData = {
      slug: 'new-profile',
      title: 'New Profile',
      description: 'New description',
      cloneFromSlug: 'test-profile'
    }

    it('should create new profile by cloning existing one', async () => {
      const profilesData = {
        profiles: [mockProfile],
        nextId: 2,
        lastModified: new Date().toISOString()
      }
      
  mockStore.get.mockResolvedValue(profilesData)
  mockStore.setJSON.mockResolvedValue(undefined)

      const result = await createProfile(createProfileData)

      expect(result).toBeDefined()
      expect(result.slug).toBe('new-profile')
      expect(result.title).toBe('New Profile')
    })

    it('should handle duplicate slug', async () => {
      const profilesData = {
        profiles: [mockProfile],
        nextId: 2,
        lastModified: new Date().toISOString()
      }
      
  mockStore.get.mockResolvedValue(profilesData)

      const duplicateData = { ...createProfileData, slug: 'test-profile' }
      
      await expect(createProfile(duplicateData)).rejects.toThrow('already exists')
    })

    it('should handle template not found', async () => {
      const profilesData = {
        profiles: [mockProfile],
        nextId: 2,
        lastModified: new Date().toISOString()
      }
      
      mockStore.get.mockResolvedValue(JSON.stringify(profilesData))

      const invalidTemplateData = { ...createProfileData, cloneFromSlug: 'nonexistent' }
      
      await expect(createProfile(invalidTemplateData)).rejects.toThrow('not found')
    })
  })
})