import {
  formatFeedbackIssueBody,
  isFeedbackType,
  isGitHubFeedbackConfigured,
  maskGitHubToken,
  normalizeGitHubFeedbackConfig,
  testGitHubConnection,
  createGitHubIssue,
} from '@/lib/githubFeedback'

describe('githubFeedback', () => {
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

  describe('normalizeGitHubFeedbackConfig', () => {
    it('normalizes row values', () => {
      expect(
        normalizeGitHubFeedbackConfig({
          github_feedback_enabled: true,
          github_token: ' ghp_test ',
          github_repo_owner: ' owner ',
          github_repo_name: ' repo ',
        })
      ).toEqual({
        github_feedback_enabled: true,
        github_token: 'ghp_test',
        github_repo_owner: 'owner',
        github_repo_name: 'repo',
      })
    })
  })

  describe('isGitHubFeedbackConfigured', () => {
    it('requires enabled flag, token, owner, and repo', () => {
      expect(
        isGitHubFeedbackConfigured({
          github_feedback_enabled: true,
          github_token: 'token',
          github_repo_owner: 'owner',
          github_repo_name: 'repo',
        })
      ).toBe(true)
      expect(
        isGitHubFeedbackConfigured({
          github_feedback_enabled: false,
          github_token: 'token',
          github_repo_owner: 'owner',
          github_repo_name: 'repo',
        })
      ).toBe(false)
    })
  })

  describe('maskGitHubToken', () => {
    it('masks long tokens', () => {
      expect(maskGitHubToken('ghp_1234567890abcdef')).toBe('ghp_****cdef')
    })

    it('returns empty for missing token', () => {
      expect(maskGitHubToken('')).toBe('')
      expect(maskGitHubToken(null)).toBe('')
    })
  })

  describe('formatFeedbackIssueBody', () => {
    it('includes user and page context', () => {
      const body = formatFeedbackIssueBody({
        title: 'Title',
        description: 'Details here',
        type: 'bug',
        userEmail: 'user@example.com',
        userName: 'Test User',
        pageUrl: 'https://example.com/default',
        profileSlug: 'default',
        profileTitle: 'Default',
      })

      expect(body).toContain('**Type:** bug')
      expect(body).toContain('Test User')
      expect(body).toContain('user@example.com')
      expect(body).toContain('**Profile:** Default')
      expect(body).toContain('https://example.com/default')
      expect(body).toContain('Details here')
    })
  })

  describe('createGitHubIssue', () => {
    beforeEach(() => {
      global.fetch = jest.fn()
    })

    it('returns error when not configured', async () => {
      const result = await createGitHubIssue(
        {
          github_feedback_enabled: false,
          github_token: null,
          github_repo_owner: '',
          github_repo_name: '',
        },
        {
          title: 'Test',
          description: 'Body',
          type: 'suggestion',
        }
      )
      expect(result).toEqual({ success: false, error: 'GitHub feedback is not configured' })
    })

    it('posts to GitHub when configured', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ html_url: 'https://github.com/o/r/issues/1' }),
      })

      const result = await createGitHubIssue(
        {
          github_feedback_enabled: true,
          github_token: 'ghp_test',
          github_repo_owner: 'owner',
          github_repo_name: 'repo',
        },
        {
          title: 'Test',
          description: 'Body',
          type: 'feature',
        }
      )

      expect(result).toEqual({ success: true, url: 'https://github.com/o/r/issues/1' })
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/issues',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  describe('testGitHubConnection', () => {
    beforeEach(() => {
      global.fetch = jest.fn()
    })

    it('requires token and repo fields', async () => {
      expect(await testGitHubConnection('', 'owner', 'repo')).toEqual({
        success: false,
        message: 'GitHub token is not configured',
      })
    })

    it('returns success when repo is reachable', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) })
      const result = await testGitHubConnection('ghp_test', 'owner', 'repo')
      expect(result.success).toBe(true)
    })
  })
})
