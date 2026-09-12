import {
  buildFeedbackPageChildren,
  buildNotionPageProperties,
  createNotionFeedbackPage,
  createNotionTestRow,
  DEFAULT_NOTION_DATABASE_ID,
  formatFeedbackPagePlainText,
  isFeedbackType,
  isNotionFeedbackConfigured,
  isValidFeedbackEmail,
  mapFeedbackTypeToNotion,
  maskNotionToken,
  normalizeFeedbackEmail,
  resolveNotionFeedbackConfig,
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

  describe('mapFeedbackTypeToNotion', () => {
    it('maps bug to Bug and other types to Idea', () => {
      expect(mapFeedbackTypeToNotion('bug')).toBe('Bug')
      expect(mapFeedbackTypeToNotion('feature')).toBe('Idea')
      expect(mapFeedbackTypeToNotion('suggestion')).toBe('Idea')
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
    it('sets Task name, Type Bug, Status Not started, and Priority Medium', () => {
      const properties = buildNotionPageProperties({
        title: 'Reader crash',
        description: 'It broke',
        type: 'bug',
      })

      expect(properties).toMatchObject({
        'Task name': { title: [{ type: 'text', text: { content: 'Reader crash' } }] },
        Type: { select: { name: 'Bug' } },
        Status: { status: { name: 'Not started' } },
        Priority: { select: { name: 'Medium' } },
      })
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
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://www.notion.so/page' }),
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
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.notion.com/v1/pages',
        expect.objectContaining({ method: 'POST' })
      )
      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string) as {
        parent: { data_source_id?: string }
        properties: { Type: { select: { name: string } } }
      }
      expect(body.parent.data_source_id).toBe(DEFAULT_NOTION_DATABASE_ID)
      expect(body.properties.Type.select.name).toBe('Idea')
    })

    it('retries with database_id when the data source parent is rejected', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ message: 'Invalid data_source_id' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://www.notion.so/db-page' }),
        })

      const result = await createNotionFeedbackPage(
        {
          notion_feedback_enabled: true,
          notion_token: 'secret_test',
          notion_database_id: '1fc7f85d-baca-4a05-aef5-5c724ce07ecd',
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
      expect(global.fetch).toHaveBeenCalledTimes(2)
      const retryBody = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body as string) as {
        parent: { database_id?: string }
      }
      expect(retryBody.parent.database_id).toBe('1fc7f85d-baca-4a05-aef5-5c724ce07ecd')
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
  })

  describe('createNotionTestRow', () => {
    beforeEach(() => {
      global.fetch = jest.fn()
    })

    it('creates an archived Polish test row', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://www.notion.so/test-row' }),
      })

      const result = await createNotionTestRow('secret_test', DEFAULT_NOTION_DATABASE_ID)
      expect(result.success).toBe(true)
      expect(result.url).toBe('https://www.notion.so/test-row')

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string) as {
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
