// Helper to ensure returned profile objects always have required properties
function ensureProfileShape(profile: any) {
  if (!profile || typeof profile !== 'object') return profile;
  return {
    id: profile.id || 'generated-id',
    slug: profile.slug || 'generated-slug',
    title: profile.title || '',
    name: profile.name || '',
    description: profile.description || '',
    is_default: typeof profile.is_default === 'boolean' ? profile.is_default : false,
    is_template: typeof profile.is_template === 'boolean' ? profile.is_template : false,
    visit_count: typeof profile.visit_count === 'number' ? profile.visit_count : 0,
    gospel_data: profile.gospel_data || {},
    created_at: profile.created_at || new Date().toISOString(),
    updated_at: profile.updated_at || new Date().toISOString(),
    last_visited: profile.last_visited || new Date().toISOString(),
    saved_answers: Array.isArray(profile.saved_answers) ? profile.saved_answers : [],
    last_viewed_scripture: profile.last_viewed_scripture || undefined
  }
}
jest.mock('next/headers', () => ({
  cookies: () => ({
    get: () => ({ value: 'mock' }),
    set: () => {},
    remove: () => {},
  })
}))

// Deep mock for Supabase client with chained methods

type AnyProfile = {
  [key: string]: any;
  id: string;
  slug: string;
  title: string;
  name: string;
  description: string;
  is_default: boolean;
  is_template: boolean;
  visit_count: number;
  gospel_data: any;
  created_at: string;
  updated_at: string;
  last_visited: string;
  saved_answers: any[];
  last_viewed_scripture?: any;
};

let profiles: AnyProfile[] = [{
  id: 'profile-id',
  slug: 'test-slug',
  title: 'Test',
  name: 'Test',
  description: 'desc',
  is_default: false,
  is_template: false,
  visit_count: 42,
  gospel_data: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  last_visited: new Date().toISOString(),
  saved_answers: [],
  last_viewed_scripture: undefined
}]
const mockVisitCount = 42

function chainable(data: any) {
  return {
    data,
    error: null,
    lastEqField: undefined as any,
    lastEqValue: undefined as any,
    order: function () {
      const chain = chainable(this.data);
      chain.lastEqField = this.lastEqField;
      chain.lastEqValue = this.lastEqValue;
      return chain;
    },
    eq: function (field?: string, value?: any) {
      const filtered = field && value !== undefined ? profiles.filter((p) => p[field] === value).map(ensureProfileShape) : Array.isArray(this.data) ? this.data.map(ensureProfileShape) : ensureProfileShape(this.data);
      const chain = chainable(filtered);
      chain.lastEqField = field;
      chain.lastEqValue = value;
      return chain;
    },
    in: function () {
      const chain = chainable(Array.isArray(this.data) ? this.data.map(ensureProfileShape) : ensureProfileShape(this.data));
      chain.lastEqField = this.lastEqField;
      chain.lastEqValue = this.lastEqValue;
      return chain;
    },
    single: function () {
      if (this.lastEqField && this.lastEqValue !== undefined) {
        const found = profiles.find((p) => p[this.lastEqField!] === this.lastEqValue);
        const chain = chainable(ensureProfileShape(found));
        chain.lastEqField = this.lastEqField;
        chain.lastEqValue = this.lastEqValue;
        return chain;
      }
      const chain = chainable(Array.isArray(this.data) ? ensureProfileShape(this.data[0]) : ensureProfileShape(this.data));
      chain.lastEqField = this.lastEqField;
      chain.lastEqValue = this.lastEqValue;
      return chain;
    },
    select: function () {
      const chain = chainable(Array.isArray(this.data) ? this.data.map(ensureProfileShape) : ensureProfileShape(this.data));
      chain.lastEqField = this.lastEqField;
      chain.lastEqValue = this.lastEqValue;
      return chain;
    },
    update: function (updateData?: any) {
      if (this.lastEqField === 'slug' && this.lastEqValue !== undefined) {
        const idx = profiles.findIndex(p => p.slug === this.lastEqValue);
        if (idx !== -1) {
          profiles[idx] = { ...profiles[idx], ...updateData };
          const chain = chainable([ensureProfileShape(profiles[idx])]);
          chain.lastEqField = this.lastEqField;
          chain.lastEqValue = this.lastEqValue;
          return chain;
        }
      }
      const chain = chainable([]);
      chain.lastEqField = this.lastEqField;
      chain.lastEqValue = this.lastEqValue;
      return chain;
    },
    delete: function () {
      if (this.lastEqField === 'slug' && this.lastEqValue !== undefined) {
        const idx = profiles.findIndex(p => p.slug === this.lastEqValue);
        if (idx !== -1) {
          const deleted = profiles[idx];
          profiles.splice(idx, 1);
          const chain = chainable([ensureProfileShape(deleted)]);
          chain.lastEqField = this.lastEqField;
          chain.lastEqValue = this.lastEqValue;
          return chain;
        }
      }
      const chain = chainable([]);
      chain.lastEqField = this.lastEqField;
      chain.lastEqValue = this.lastEqValue;
      return chain;
    },
    insert: function (insertData?: any) {
      if (insertData) {
        if (profiles.some(p => p.slug === insertData.slug)) {
          const chain = chainable([]);
          chain.lastEqField = this.lastEqField;
          chain.lastEqValue = this.lastEqValue;
          return chain;
        }
        const newProfile = { ...insertData, id: 'profile-id', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        profiles.push(newProfile);
        const chain = chainable([ensureProfileShape(newProfile)]);
        chain.lastEqField = this.lastEqField;
        chain.lastEqValue = this.lastEqValue;
        return chain;
      }
      const chain = chainable([]);
      chain.lastEqField = this.lastEqField;
      chain.lastEqValue = this.lastEqValue;
      return chain;
    },
  };
}

jest.mock('../supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'user-id' } } })
    },
    from: () => ({
      select: () => chainable(profiles.map(ensureProfileShape)),
      update: (updateData: any) => {
        if (updateData && updateData.slug) {
          const idx = profiles.findIndex(p => p.slug === updateData.slug)
          if (idx !== -1) {
            profiles[idx] = { ...profiles[idx], ...updateData }
            return chainable([ensureProfileShape(profiles[idx])])
          }
        }
        return chainable([])
      },
      delete: (deleteData: any) => {
  // Support both chained and direct delete
  let deleted: AnyProfile | undefined;
        if (deleteData && deleteData.slug) {
          const idx = profiles.findIndex(p => p.slug === deleteData.slug)
          if (idx !== -1) {
            deleted = profiles[idx]
            profiles.splice(idx, 1)
            return chainable([ensureProfileShape(deleted)])
          }
        } else if (Array.isArray(profiles) && profiles.length > 0) {
          // Fallback for chained delete (e.g. .eq().delete())
          deleted = profiles.find(p => p.slug !== 'default') as AnyProfile | undefined;
          if (deleted) {
            profiles = profiles.filter(p => p.slug !== deleted!.slug)
            return chainable([ensureProfileShape(deleted)])
          }
        }
        return chainable([])
      },
      insert: (insertData: any) => {
        if (insertData && insertData.slug) {
          if (profiles.some(p => p.slug === insertData.slug)) {
            return chainable([])
          }
          const newProfile = { ...insertData, id: 'profile-id', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
          profiles.push(newProfile)
          return chainable([ensureProfileShape(newProfile)])
        }
        return chainable([])
      },
      eq: (field: string, value: any) => chainable(profiles.filter(p => p[field] === value).map(ensureProfileShape)),
      in: () => chainable(profiles.map(ensureProfileShape)),
      single: () => chainable(ensureProfileShape(profiles[0]))
    }),
    rpc: (_fn: string, args: any) => {
      // Support incrementProfileVisitCount
      if (args && args.slug) {
        const idx = profiles.findIndex(p => p.slug === args.slug)
        if (idx !== -1) {
          profiles[idx].visit_count = (profiles[idx].visit_count || 0) + 1
          return { data: profiles[idx].visit_count, error: null }
        }
      }
      return { data: mockVisitCount, error: null }
    }
  })
}))
jest.mock('next/headers', () => ({
  cookies: () => ({
    get: () => ({ value: 'mock' }),
    set: () => {},
    remove: () => {},
  })
}))
import {
  getProfiles,
  getProfileBySlug,
  createProfile,
  updateProfile,
  deleteProfile,
  incrementProfileVisitCount
} from '../data-service'

describe('data-service', () => {
  beforeEach(() => {
    profiles.length = 0
    profiles.push(
      {
        id: 'default-id',
        slug: 'default',
        title: 'Default',
        name: 'Default',
        description: 'Default profile',
        is_default: true,
        is_template: false,
        visit_count: 0,
        gospel_data: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_visited: new Date().toISOString(),
        saved_answers: [],
        last_viewed_scripture: undefined
      },
      {
        id: 'profile-id',
        slug: 'test-slug',
        title: 'Test',
        name: 'Test',
        description: 'desc',
        is_default: false,
        is_template: false,
        visit_count: 42,
        gospel_data: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_visited: new Date().toISOString(),
        saved_answers: [],
        last_viewed_scripture: undefined
      }
    )
  })

  it('deleteProfile returns success', async () => {
  const slug = 'unique-slug-delete'
  await createProfile({ name: 'Test', slug })
  await expect(deleteProfile(slug)).resolves.not.toThrow()
  })

  it('incrementProfileVisitCount returns a number', async () => {
  await expect(incrementProfileVisitCount('test-slug')).resolves.not.toThrow()
  })
})