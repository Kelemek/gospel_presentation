import { logger } from '@/lib/logger'

export type FeedbackType = 'suggestion' | 'feature' | 'bug'
export type NotionIssueType = 'Bug' | 'Idea' | 'Polish' | 'Content'
export type NotionIssueStatus = 'Not started' | 'In progress' | 'Done' | 'Archived'
export type NotionIssuePriority = 'High' | 'Medium' | 'Low'
export type NotionFeedbackTestAction = 'connection' | 'create'

export interface NotionFeedbackConfig {
  notion_feedback_enabled: boolean
  notion_token: string | null
  notion_database_id: string
  token_from_env: boolean
  database_id_from_env: boolean
}

export interface CreateFeedbackPayload {
  title: string
  description: string
  type: FeedbackType
  userEmail?: string | null
  pageUrl?: string | null
  profileSlug?: string | null
  profileTitle?: string | null
}

export interface NotionFeedbackConfigRow {
  notion_feedback_enabled?: boolean | null
  notion_token?: string | null
  notion_database_id?: string | null
}

export interface NotionRichText {
  type: 'text'
  text: { content: string; link?: { url: string } | null }
  annotations?: { italic?: boolean }
}

export interface NotionParagraphBlock {
  object: 'block'
  type: 'paragraph'
  paragraph: { rich_text: NotionRichText[] }
}

export interface NotionDividerBlock {
  object: 'block'
  type: 'divider'
  divider: Record<string, never>
}

export type NotionBlock = NotionParagraphBlock | NotionDividerBlock

export const DEFAULT_NOTION_DATABASE_ID = '5c7d52ea-16a5-4471-914f-cac7baf28add'
export const NOTION_FEEDBACK_TOKEN_ENV = 'NOTION_FEEDBACK_TOKEN'
export const NOTION_FEEDBACK_DATABASE_ID_ENV = 'NOTION_FEEDBACK_DATABASE_ID'
export const NOTION_FEEDBACK_COLUMNS =
  'notion_feedback_enabled, notion_token, notion_database_id' as const

export function asNotionFeedbackConfigRow(data: unknown): NotionFeedbackConfigRow | null {
  if (!data || typeof data !== 'object') return null
  return data as NotionFeedbackConfigRow
}
export const TEST_CREATE_ROW_TITLE = '[Test] Feedback connection'

const FETCH_TIMEOUT_MS = 10_000
const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION_DATA_SOURCE = '2025-09-03'
const NOTION_VERSION_DATABASE = '2022-06-28'
const MAX_FEEDBACK_EMAIL_LEN = 254
const FEEDBACK_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isFeedbackType(value: unknown): value is FeedbackType {
  return value === 'suggestion' || value === 'feature' || value === 'bug'
}

export function isNotionFeedbackTestAction(value: unknown): value is NotionFeedbackTestAction {
  return value === 'connection' || value === 'create'
}

export function normalizeFeedbackEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.toLowerCase()
}

export function isValidFeedbackEmail(email: string): boolean {
  return email.length <= MAX_FEEDBACK_EMAIL_LEN && FEEDBACK_EMAIL_RE.test(email)
}

export function mapFeedbackTypeToNotion(type: FeedbackType): NotionIssueType {
  switch (type) {
    case 'bug':
      return 'Bug'
    case 'feature':
    case 'suggestion':
      return 'Idea'
    default: {
      const _exhaustive: never = type
      return _exhaustive
    }
  }
}

export function normalizeNotionId(value: string): string {
  return value.trim().replace(/[{}]/g, '')
}

export function resolveNotionFeedbackConfig(
  data: unknown,
  env: NodeJS.Dict<string> = process.env
): NotionFeedbackConfig {
  const row = asNotionFeedbackConfigRow(data)
  const rowToken = row?.notion_token?.trim() || null
  const envToken = env[NOTION_FEEDBACK_TOKEN_ENV]?.trim() || null
  const rowDatabaseId = row?.notion_database_id ? normalizeNotionId(row.notion_database_id) : ''
  const envDatabaseId = env[NOTION_FEEDBACK_DATABASE_ID_ENV]
    ? normalizeNotionId(env[NOTION_FEEDBACK_DATABASE_ID_ENV] as string)
    : ''

  return {
    notion_feedback_enabled: row?.notion_feedback_enabled === true,
    notion_token: rowToken || envToken,
    notion_database_id: rowDatabaseId || envDatabaseId || DEFAULT_NOTION_DATABASE_ID,
    token_from_env: !rowToken && Boolean(envToken),
    database_id_from_env: !rowDatabaseId && Boolean(envDatabaseId),
  }
}

export function isNotionFeedbackConfigured(config: NotionFeedbackConfig): boolean {
  return Boolean(config.notion_feedback_enabled && config.notion_token && config.notion_database_id)
}

export function maskNotionToken(token: string | null | undefined): string {
  if (!token?.trim()) return ''
  const trimmed = token.trim()
  if (trimmed.length <= 8) return '****'
  return `${trimmed.slice(0, 4)}****${trimmed.slice(-4)}`
}

export function formatFeedbackPagePlainText(payload: CreateFeedbackPayload): string {
  const emailLabel = normalizeFeedbackEmail(payload.userEmail) ?? 'Anonymous'
  const contextLines: string[] = []
  if (payload.profileSlug) {
    contextLines.push(
      `Profile: ${payload.profileTitle?.trim() || payload.profileSlug} (/${payload.profileSlug})`
    )
  }
  if (payload.pageUrl?.trim()) {
    contextLines.push(`Page URL: ${payload.pageUrl.trim()}`)
  }

  const contextBlock = contextLines.length > 0 ? `\n${contextLines.join('\n')}\n` : '\n'

  return `
Type: ${payload.type}
User Email: ${emailLabel}
${contextBlock}
${payload.description.trim()}

This page was created from the in-app feedback form.
`.trim()
}

function paragraph(content: string, italic = false): NotionParagraphBlock {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [
        {
          type: 'text',
          text: { content },
          ...(italic ? { annotations: { italic: true } } : {}),
        },
      ],
    },
  }
}

export function buildFeedbackPageChildren(payload: CreateFeedbackPayload): NotionBlock[] {
  const emailLabel = normalizeFeedbackEmail(payload.userEmail) ?? 'Anonymous'
  const blocks: NotionBlock[] = [
    paragraph(`Type: ${payload.type}`),
    paragraph(`User Email: ${emailLabel}`),
  ]

  if (payload.profileSlug) {
    const label = payload.profileTitle?.trim() || payload.profileSlug
    blocks.push(paragraph(`Profile: ${label} (/${payload.profileSlug})`))
  }

  if (payload.pageUrl?.trim()) {
    const url = payload.pageUrl.trim()
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: 'Page URL: ' } },
          { type: 'text', text: { content: url, link: { url } } },
        ],
      },
    })
  }

  blocks.push({ object: 'block', type: 'divider', divider: {} })
  blocks.push(paragraph(payload.description.trim()))
  blocks.push(paragraph('This page was created from the in-app feedback form.', true))
  return blocks
}

export function buildNotionPageProperties(
  payload: CreateFeedbackPayload,
  options?: {
    type?: NotionIssueType
    status?: NotionIssueStatus
    priority?: NotionIssuePriority | null
  }
): Record<string, unknown> {
  const type = options?.type ?? mapFeedbackTypeToNotion(payload.type)
  const status = options?.status ?? 'Not started'
  const priority = options && 'priority' in options ? options.priority : 'Medium'

  const properties: Record<string, unknown> = {
    'Task name': {
      title: [{ type: 'text', text: { content: payload.title.trim().slice(0, 2000) } }],
    },
    Type: { select: { name: type } },
    Status: { status: { name: status } },
  }

  if (priority) {
    properties.Priority = { select: { name: priority } }
  }

  return properties
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

function notionHeaders(token: string, version: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': version,
    'Content-Type': 'application/json',
  }
}

async function readNotionError(response: Response, fallback: string): Promise<string> {
  try {
    const errorData = (await response.json()) as { message?: string; code?: string }
    if (errorData.message) return errorData.message
    if (errorData.code) return errorData.code
  } catch {
    // ignore parse errors
  }
  return fallback
}

function notionObjectTitle(data: { title?: unknown; name?: unknown }): string {
  if (typeof data.name === 'string' && data.name.trim()) return data.name.trim()
  if (Array.isArray(data.title)) {
    return data.title
      .map((part) => {
        if (part && typeof part === 'object' && 'plain_text' in part) {
          return String((part as { plain_text?: string }).plain_text ?? '')
        }
        return ''
      })
      .join('')
      .trim()
  }
  return ''
}

function shouldRetryAsDatabaseParent(status: number): boolean {
  return status === 400 || status === 404
}

export async function createNotionFeedbackPage(
  config: NotionFeedbackConfig,
  payload: CreateFeedbackPayload,
  options?: {
    type?: NotionIssueType
    status?: NotionIssueStatus
    priority?: NotionIssuePriority | null
  }
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  if (!config.notion_token || !config.notion_database_id) {
    return { success: false, error: 'Notion feedback is not configured' }
  }

  const token = config.notion_token
  const databaseId = normalizeNotionId(config.notion_database_id)
  const pageBody = {
    properties: buildNotionPageProperties(payload, options),
    children: buildFeedbackPageChildren(payload),
  }

  try {
    const dataSourceResponse = await fetchWithTimeout(`${NOTION_API_BASE}/pages`, {
      method: 'POST',
      headers: notionHeaders(token, NOTION_VERSION_DATA_SOURCE),
      body: JSON.stringify({
        parent: { type: 'data_source_id', data_source_id: databaseId },
        ...pageBody,
      }),
    })

    let response = dataSourceResponse
    if (!dataSourceResponse.ok && shouldRetryAsDatabaseParent(dataSourceResponse.status)) {
      response = await fetchWithTimeout(`${NOTION_API_BASE}/pages`, {
        method: 'POST',
        headers: notionHeaders(token, NOTION_VERSION_DATABASE),
        body: JSON.stringify({
          parent: { type: 'database_id', database_id: databaseId },
          ...pageBody,
        }),
      })
    }

    if (!response.ok) {
      const message = await readNotionError(response, 'Failed to create Notion page')
      logger.error('[notionFeedback] Notion API error:', message)
      return { success: false, error: message }
    }

    const page = (await response.json()) as { url?: string }
    return { success: true, url: page.url || '' }
  } catch (err) {
    logger.error('[notionFeedback] Exception creating page:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

export async function testNotionConnection(
  token: string,
  databaseId: string
): Promise<{ success: boolean; message: string }> {
  if (!token.trim()) {
    return { success: false, message: 'Notion token is not configured' }
  }
  const id = normalizeNotionId(databaseId)
  if (!id) {
    return { success: false, message: 'Database or data source ID is required' }
  }

  try {
    const dataSourceResponse = await fetchWithTimeout(`${NOTION_API_BASE}/data_sources/${id}`, {
      method: 'GET',
      headers: notionHeaders(token.trim(), NOTION_VERSION_DATA_SOURCE),
    })

    if (dataSourceResponse.ok) {
      const data = (await dataSourceResponse.json()) as { title?: unknown; name?: unknown }
      const title = notionObjectTitle(data) || 'Site issues'
      return { success: true, message: `Successfully connected to Notion data source “${title}”` }
    }

    const databaseResponse = await fetchWithTimeout(`${NOTION_API_BASE}/databases/${id}`, {
      method: 'GET',
      headers: notionHeaders(token.trim(), NOTION_VERSION_DATABASE),
    })

    if (databaseResponse.ok) {
      const data = (await databaseResponse.json()) as { title?: unknown; name?: unknown }
      const title = notionObjectTitle(data) || 'Site issues'
      return { success: true, message: `Successfully connected to Notion database “${title}”` }
    }

    const message = await readNotionError(
      dataSourceResponse.ok ? databaseResponse : dataSourceResponse,
      'Failed to access Notion database'
    )
    return { success: false, message }
  } catch (err) {
    logger.error('[notionFeedback] Connection test error:', err)
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

export async function createNotionTestRow(
  token: string,
  databaseId: string
): Promise<{ success: boolean; message: string; url?: string }> {
  const result = await createNotionFeedbackPage(
    {
      notion_feedback_enabled: true,
      notion_token: token.trim() || null,
      notion_database_id: normalizeNotionId(databaseId),
      token_from_env: false,
      database_id_from_env: false,
    },
    {
      title: TEST_CREATE_ROW_TITLE,
      description: 'This row was created by Admin → Settings → Test create row.',
      type: 'suggestion',
    },
    {
      type: 'Polish',
      status: 'Archived',
      priority: 'Low',
    }
  )

  if (!result.success) {
    return { success: false, message: result.error }
  }

  return {
    success: true,
    message: result.url
      ? `Created a test Site issues row: ${result.url}`
      : 'Created a test Site issues row',
    url: result.url,
  }
}
