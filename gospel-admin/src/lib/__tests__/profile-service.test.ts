import {
	generateSecureSlug,
	validateProfileSlug,
	validateProfileTitle,
	validateCreateProfileRequest,
	createProfileFromRequest,
	createDefaultProfile,
	sanitizeProfileForPublic,
	generateSlugSuggestion
} from '../profile-service'
import { PROFILE_VALIDATION } from '../types'

describe('profile-service', () => {
		test('generateSecureSlug returns a lowercase alphanumeric slug that starts with a letter', () => {
			const s1 = generateSecureSlug()
			const s2 = generateSecureSlug()
			expect(typeof s1).toBe('string')
			// must be within allowed slug length bounds
			expect(s1.length).toBeGreaterThanOrEqual(PROFILE_VALIDATION.SLUG_MIN_LENGTH)
			expect(s1.length).toBeLessThanOrEqual(PROFILE_VALIDATION.SLUG_MAX_LENGTH)
			expect(s1).toMatch(/^[a-z][a-z0-9]*$/)
			// Very unlikely to be equal twice
			expect(s1).not.toBe(s2)
		})

	describe('validateProfileSlug', () => {
		test('rejects too short slugs', () => {
			const res = validateProfileSlug('ab', [])
			expect(res.isValid).toBe(false)
			expect(res.error).toMatch(/at least/)
		})

		test('rejects too long slugs', () => {
			const long = 'a'.repeat(PROFILE_VALIDATION.SLUG_MAX_LENGTH + 1)
			const res = validateProfileSlug(long, [])
			expect(res.isValid).toBe(false)
			expect(res.error).toMatch(/no more than/)
		})

		test('rejects slugs that do not start with a letter', () => {
			const res = validateProfileSlug('1abc', [])
			expect(res.isValid).toBe(false)
			expect(res.error).toMatch(/start with a letter/)
		})

		test('rejects reserved slugs', () => {
			const res = validateProfileSlug('admin', [])
			expect(res.isValid).toBe(false)
			expect(res.error).toMatch(/reserved word/)
		})

		test('flags non-unique slugs', () => {
			const res = validateProfileSlug('myprofile', ['myprofile'])
			expect(res.isValid).toBe(true)
			expect(res.isUnique).toBe(false)
			expect(res.error).toMatch(/already exists/)
		})

		test('accepts valid slugs', () => {
			const res = validateProfileSlug('goodslug', ['other'])
			expect(res.isValid).toBe(true)
			expect(res.isUnique).toBe(true)
		})
	})

	describe('validateProfileTitle', () => {
		test('rejects empty title', () => {
			const res = validateProfileTitle('   ')
			expect(res.isValid).toBe(false)
			expect(res.error).toMatch(/Title is required/)
		})

		test('rejects too long title', () => {
			const long = 'x'.repeat(PROFILE_VALIDATION.TITLE_MAX_LENGTH + 1)
			const res = validateProfileTitle(long)
			expect(res.isValid).toBe(false)
			expect(res.error).toMatch(/no more than/)
		})

		test('accepts valid title', () => {
			const res = validateProfileTitle('A Good Title')
			expect(res.isValid).toBe(true)
		})
	})

	test('validateCreateProfileRequest generates slug when missing and validates', () => {
		const req = { title: '  My Profile  ' } as any
		const res = validateCreateProfileRequest(req, [])
		expect(res.title.isValid).toBe(true)
		expect(res.slug.isValid).toBe(true)
		// generated slug should be unique and follow pattern
		expect(res.slug.isUnique).toBe(true)
	})

	test('createProfileFromRequest deep-clones gospel data and normalizes fields', () => {
		const source = [{ section: 's', title: 't', subsections: [] }]
		const req = { title: '  Hello  ', slug: 'CustomSlug' } as any
		const profile = createProfileFromRequest(req, source)
		expect(profile.slug).toBe('customslug')
		expect(profile.title).toBe('Hello')
		expect(profile.description).toBe('')
		// modify source and assert profile gospelData not mutated
		;(source as any)[0].title = 'changed'
		expect(profile.gospelData[0].title).toBe('t')
	})

	test('createDefaultProfile returns default slug and flags', () => {
		const source = [{ section: 's', title: 't', subsections: [] }]
		const p = createDefaultProfile(source)
		expect(p.slug).toBe('default')
		expect(p.isDefault).toBe(true)
		expect(p.isTemplate).toBe(true)
	})

	test('sanitizeProfileForPublic removes id and timestamps', () => {
		const now = new Date()
		const profile: any = {
			id: 'uuid',
			slug: 's',
			title: 't',
			description: 'd',
			gospelData: [],
			isDefault: false,
			isTemplate: false,
			visitCount: 0,
			createdAt: now,
			updatedAt: now
		}
		const publicProfile = sanitizeProfileForPublic(profile)
		expect((publicProfile as any).id).toBeUndefined()
		expect((publicProfile as any).createdAt).toBeUndefined()
		expect((publicProfile as any).updatedAt).toBeUndefined()
		expect(publicProfile.slug).toBe('s')
	})

	describe('generateSlugSuggestion', () => {
		test('creates a clean slug from title', () => {
			const s = generateSlugSuggestion('My New Profile!')
			expect(s).toMatch(/^[a-z][a-z0-9]*$/)
			expect(s.length).toBeGreaterThanOrEqual(PROFILE_VALIDATION.SLUG_MIN_LENGTH)
		})

		test('pads short slugs to minimum length', () => {
			const s = generateSlugSuggestion('A')
			expect(s.length).toBeGreaterThanOrEqual(PROFILE_VALIDATION.SLUG_MIN_LENGTH)
			expect(s).toMatch(/^[a-z][a-z0-9]*$/)
		})

		test('adds numeric suffix when base exists', () => {
			const base = generateSlugSuggestion('Sample Title')
			const existing = [base, base + '1', base + '2']
			const s = generateSlugSuggestion('Sample Title', existing)
			expect(existing.includes(s)).toBe(false)
			expect(s).toMatch(/^[a-z][a-z0-9]*$/)
		})
	})
})
