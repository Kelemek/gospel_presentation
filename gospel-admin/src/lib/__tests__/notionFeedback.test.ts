import {
  asNotionFeedbackConfigRow,
  buildFeedbackPageChildren,
  buildNotionPageProperties,
  createNotionFeedbackPage,
  createNotionTestRow,
  DEFAULT_NOTION_DATABASE_ID,
  DEFAULT_NOTION_DATABASE_PAGE_ID,
  formatFeedbackPagePlainText,
  isFeedbackType,
  isNotionFeedbackConfigured,
  isValidFeedbackEmail,
  mapFeedbackTypeToNotion,
  mapFeedbackTypeToPriority,
  maskNotionToken,
  normalizeFeedbackEmail,
  normalizeNotionId,
  resolveNotionFeedbackConfig,
  resolveNotionParent,
  TEST_CREATE_ROW_TITLE,
  testNotionConnection,
} from '@/lib/notionFeedback'

describe('notionFeedback', () => {
  const originalEnv = process.env

  afterEach(() => {
    process.env = originalEnv
  })

  describe('normalizeFeedbackEmail', () => {
    it('trims and lowercases valid input', () => {
      expect(normalizeFeedbackEmail('  Reader@Example.COM ')).toBe('reader@example.com')
    })

    it('returns null for empty values', () => {
      expect(normalizeFeedbackEmail('')).toBeNull()
      expect(normalizeFeedbackEmail('   ')).toBeNull()
      expect(normalizeFeedbackEmail(null)).toBeNull()
    })
  })

  describe('isValidFeedbackEmail', () => {
    it('accepts common email shapes', () => {
      expect(isValidFeedbackEmail('reader@example.com')).toBe(true)
    })

    it('rejects invalid email shapes', () => {
      expect(isValidFeedbackEmail('not-an-email')).toBe(false)
      expect(isValidFeedbackEmail('a@b')).toBe(false)
    })
  })

  describe('isFeedbackType', () => {
    it('accepts valid types', () => {
      expect(isFeedbackType('suggestion')).toBe(true)
      expect(isFeedbackType('feature')).toBe(true)
      expect(isFeedbackType('bug')).toBe(true)
    })

    it('rejects invalid types', () => {
      expect(isFeedbackType('other')).toBe(false)
      expect(isFeedbackType(null)).toBe(false)
    })
  })

  describe('normalizeNotionId', () => {
    it('hyphenates compact IDs and extracts them from Notion URLs', () => {
      expect(normalizeNotionId('1fc7f85dbaca4a05aef55c724ce07ecd')).toBe(
        DEFAULT_NOTION_DATABASE_PAGE_ID
      )
      expect(
        normalizeNotionId('https://app.notion.com/p/1fc7f85dbaca4a05aef55c724ce07ecd?pvs=204')
      ).toBe(DEFAULT_NOTION_DATABASE_PAGE_ID)
    })
  })

  describe('mapFeedbackTypeToNotion', () => {
    it('maps each feedback type to a matching Notion type', () => {
      expect(mapFeedbackTypeToNotion('bug')).toBe('Bug')
      expect(mapFeedbackTypeToNotion('feature')).toBe('Feature')
      expect(mapFeedbackTypeToNotion('suggestion')).toBe('Suggestion')
    })
  })

  describe('mapFeedbackTypeToPriority', () => {
    it('sets bugs high, features medium, and suggestions low', () => {
      expect(mapFeedbackTypeToPriority('bug')).toBe('High')
      expect(mapFeedbackTypeToPriority('feature')).toBe('Medium')
      expect(mapFeedbackTypeToPriority('suggestion')).toBe('Low')
    })
  })

  describe('resolveNotionFeedbackConfig', () => {
    it('prefers stored token and database id over env and default', () => {
      expect(
        resolveNotionFeedbackConfig(
          {
            notion_feedback_enabled: true,
            notion_token: ' secret_db ',
            notion_database_id: ' 11111111-1111-1111-1111-111111111111 ',
          },
          {
            NOTION_FEEDBACK_TOKEN: 'secret_env',
            NOTION_FEEDBACK_DATABASE_ID: '22222222-2222-2222-2222-222222222222',
          }
        )
      ).toEqual({
        notion_feedback_enabled: true,
        notion_token: 'secret_db',
        notion_database_id: '11111111-1111-1111-1111-111111111111',
        token_from_env: false,
        database_id_from_env: false,
      })
    })

    it('falls back to env token and the Site issues default id', () => {
      const config = resolveNotionFeedbackConfig(
        { notion_feedback_enabled: true, notion_token: null, notion_database_id: '' },
        { NOTION_FEEDBACK_TOKEN: 'secret_env' }
      )
      expect(config.notion_token).toBe('secret_env')
      expect(config.token_from_env).toBe(true)
      expect(config.notion_database_id).toBe(DEFAULT_NOTION_DATABASE_ID)
    })

    it('treats missing or non-object rows as empty stored config', () => {
      const config = resolveNotionFeedbackConfig(null, { NOTION_FEEDBACK_TOKEN: 'secret_env' })
      expect(config.notion_feedback_enabled).toBe(false)
      expect(config.notion_token).toBe('secret_env')
      expect(asNotionFeedbackConfigRow(null)).toBeNull()
      expect(asNotionFeedbackConfigRow('not-a-row')).toBeNull()
    })
  })

  describe('isNotionFeedbackConfigured', () => {
    it('requires enabled flag, token, and database id', () => {
      expect(
        isNotionFeedbackConfigured({
          notion_feedback_enabled: true,
          notion_token: 'token',
          notion_database_id: DEFAULT_NOTION_DATABASE_ID,
          token_from_env: false,
          database_id_from_env: false,
        })
      ).toBe(true)
      expect(
        isNotionFeedbackConfigured({
          notion_feedback_enabled: false,
          notion_token: 'token',
          notion_database_id: DEFAULT_NOTION_DATABASE_ID,
          token_from_env: false,
          database_id_from_env: false,
        })
      ).toBe(false)
    })
  })

  describe('maskNotionToken', () => {
    it('masks long tokens', () => {
      expect(maskNotionToken('secret_1234567890abcdef')).toBe('secr****cdef')
    })

    it('returns empty for missing token', () => {
      expect(maskNotionToken('')).toBe('')
      expect(maskNotionToken(null)).toBe('')
    })
  })

  describe('formatFeedbackPagePlainText', () => {
    it('includes email and page context', () => {
      const body = formatFeedbackPagePlainText({
        title: 'Title',
        description: 'Details here',
        type: 'bug',
        userEmail: 'user@example.com',
        pageUrl: 'https://example.com/default',
        profileSlug: 'default',
        profileTitle: 'Default',
      })

      expect(body).toContain('Type: bug')
      expect(body).toContain('user@example.com')
      expect(body).toContain('Profile: Default')
      expect(body).toContain('https://example.com/default')
      expect(body).toContain('Details here')
    })

    it('uses Anonymous when email is empty', () => {
      const body = formatFeedbackPagePlainText({
        title: 'Title',
        description: 'Details here',
        type: 'suggestion',
        userEmail: null,
      })

      expect(body).toContain('User Email: Anonymous')
    })
  })

  describe('buildNotionPageProperties', () => {
    it('sets Task name, Type Bug, Status Not started, and Priority High', () => {
      const properties = buildNotionPageProperties({
        title: 'Reader crash',
        description: 'It broke',
        type: 'bug',
      })

      expect(properties).toMatchObject({
        'Task name': { title: [{ type: 'text', text: { content: 'Reader crash' } }] },
        Type: { select: { name: 'Bug' } },
        Status: { status: { name: 'Not started' } },
        Priority: { select: { name: 'High' } },
      })
      expect(properties.Email).toBeUndefined()
    })

    it('sets the Email column when the submitter left a valid address', () => {
      const properties = buildNotionPageProperties({
        title: 'Reader crash',
        description: 'It broke',
        type: 'bug',
        userEmail: '  Reader@Example.COM ',
      })

      expect(properties.Email).toEqual({ email: 'reader@example.com' })
    })
  })

  describe('buildFeedbackPageChildren', () => {
    it('puts description and page URL into page body blocks', () => {
      const children = buildFeedbackPageChildren({
        title: 'Title',
        description: 'Please fix this',
        type: 'feature',
        pageUrl: 'https://example.com/default',
        profileSlug: 'default',
        profileTitle: 'Default',
      })

      const texts = JSON.stringify(children)
      expect(texts).toContain('Please fix this')
      expect(texts).toContain('https://example.com/default')
      expect(texts).toContain('Profile: Default')
    })
  })

  describe('createNotionFeedbackPage', () => {
    beforeEach(() => {
      global.fetch = jest.fn()
    })

    it('returns error when not configured', async () => {
      const result = await createNotionFeedbackPage(
        {
          notion_feedback_enabled: false,
          notion_token: null,
          notion_database_id: '',
          token_from_env: false,
          database_id_from_env: false,
        },
        {
          title: 'Test',
          description: 'Body',
          type: 'suggestion',
        }
      )
      expect(result).toEqual({ success: false, error: 'Notion feedback is not configured' })
    })

    it('posts to Notion with a data_source parent when configured', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(async (url: string) => {
        if (String(url).includes('/data_sources/')) {
          return { ok: true, json: async () => ({ id: DEFAULT_NOTION_DATABASE_ID, name: 'Site issues' }) }
        }
        return { ok: true, json: async () => ({ url: 'https://www.notion.so/page' }) }
      })

      const result = await createNotionFeedbackPage(
        {
          notion_feedback_enabled: true,
          notion_token: 'secret_test',
          notion_database_id: DEFAULT_NOTION_DATABASE_ID,
          token_from_env: false,
          database_id_from_env: false,
        },
        {
          title: 'Test',
          description: 'Body',
          type: 'feature',
        }
      )

      expect(result).toEqual({ success: true, url: 'https://www.notion.so/page' })
      const pageCall = (global.fetch as jest.Mock).mock.calls.find(([url]: [string]) =>
        String(url).endsWith('/pages')
      )
      expect(pageCall).toBeDefined()
      const body = JSON.parse(pageCall[1].body as string) as {
        parent: { data_source_id?: string }
        properties: { Type: { select: { name: string } } }
      }
      expect(body.parent.data_source_id).toBe(DEFAULT_NOTION_DATABASE_ID)
      expect(body.properties.Type.select.name).toBe('Feature')
    })

    it('resolves a database page ID to its data source before creating', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(async (url: string) => {
        if (String(url).includes('/data_sources/')) {
          return { ok: false, status: 404, json: async () => ({ message: 'not a data source' }) }
        }
        if (String(url).includes('/databases/')) {
          return {
            ok: true,
            json: async () => ({
              id: DEFAULT_NOTION_DATABASE_PAGE_ID,
              data_sources: [{ id: DEFAULT_NOTION_DATABASE_ID, name: 'Site issues' }],
            }),
          }
        }
        return { ok: true, json: async () => ({ url: 'https://www.notion.so/db-page' }) }
      })

      const result = await createNotionFeedbackPage(
        {
          notion_feedback_enabled: true,
          notion_token: 'secret_test',
          notion_database_id: DEFAULT_NOTION_DATABASE_PAGE_ID,
          token_from_env: false,
          database_id_from_env: false,
        },
        {
          title: 'Test',
          description: 'Body',
          type: 'bug',
        }
      )

      expect(result).toEqual({ success: true, url: 'https://www.notion.so/db-page' })
      const pageCall = (global.fetch as jest.Mock).mock.calls.find(([url]: [string]) =>
        String(url).endsWith('/pages')
      )
      const body = JSON.parse(pageCall[1].body as string) as {
        parent: { data_source_id?: string }
      }
      expect(body.parent.data_source_id).toBe(DEFAULT_NOTION_DATABASE_ID)
    })
  })

  describe('testNotionConnection', () => {
    beforeEach(() => {
      global.fetch = jest.fn()
    })

    it('requires token and database id', async () => {
      expect(await testNotionConnection('', DEFAULT_NOTION_DATABASE_ID)).toEqual({
        success: false,
        message: 'Notion token is not configured',
      })
    })

    it('returns success when the data source is reachable', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'Site issues' }),
      })
      const result = await testNotionConnection('secret_test', DEFAULT_NOTION_DATABASE_ID)
      expect(result.success).toBe(true)
      expect(result.message).toContain('Site issues')
    })

    it('explains how to connect the integration when Notion cannot see the ID', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          message: 'Could not find database with ID: 5c7d52ea-16a5-4471-914f-cac7baf28add.',
        }),
      })
      const result = await testNotionConnection('secret_test', DEFAULT_NOTION_DATABASE_ID)
      expect(result.success).toBe(false)
      expect(result.message).toContain('Content access')
      expect(result.message).toContain('cannot see any databases yet')
    })
  })

  describe('resolveNotionParent', () => {
    beforeEach(() => {
      global.fetch = jest.fn()
    })

    it('uses retrieve-database data_sources when the pasted ID is the database page', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(async (url: string) => {
        if (String(url).includes('/data_sources/')) {
          return { ok: false, status: 404, json: async () => ({ message: 'not a data source' }) }
        }
        return {
          ok: true,
          json: async () => ({
            id: DEFAULT_NOTION_DATABASE_PAGE_ID,
            data_sources: [{ id: DEFAULT_NOTION_DATABASE_ID, name: 'Site issues' }],
          }),
        }
      })

      const result = await resolveNotionParent('secret_test', DEFAULT_NOTION_DATABASE_PAGE_ID)
      expect(result).toEqual({
        ok: true,
        parent: {
          dataSourceId: DEFAULT_NOTION_DATABASE_ID,
          databaseId: DEFAULT_NOTION_DATABASE_PAGE_ID,
          title: 'Site issues',
        },
      })
    })
  })

  describe('createNotionTestRow', () => {
    beforeEach(() => {
      global.fetch = jest.fn()
    })

    it('creates an archived Polish test row', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(async (url: string) => {
        if (String(url).includes('/data_sources/')) {
          return { ok: true, json: async () => ({ id: DEFAULT_NOTION_DATABASE_ID, name: 'Site issues' }) }
        }
        return { ok: true, json: async () => ({ url: 'https://www.notion.so/test-row' }) }
      })

      const result = await createNotionTestRow('secret_test', DEFAULT_NOTION_DATABASE_ID)
      expect(result.success).toBe(true)
      expect(result.url).toBe('https://www.notion.so/test-row')

      const pageCall = (global.fetch as jest.Mock).mock.calls.find(([url]: [string]) =>
        String(url).endsWith('/pages')
      )
      const body = JSON.parse(pageCall[1].body as string) as {
        properties: {
          'Task name': { title: Array<{ text: { content: string } }> }
          Type: { select: { name: string } }
          Status: { status: { name: string } }
        }
      }
      expect(body.properties['Task name'].title[0].text.content).toBe(TEST_CREATE_ROW_TITLE)
      expect(body.properties.Type.select.name).toBe('Polish')
      expect(body.properties.Status.status.name).toBe('Archived')
    })
  })
})
