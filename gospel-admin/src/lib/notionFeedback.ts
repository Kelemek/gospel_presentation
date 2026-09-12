import { logger } from '@/lib/logger'

export type FeedbackType = 'suggestion' | 'feature' | 'bug'
export type NotionIssueType = 'Bug' | 'Feature' | 'Suggestion' | 'Idea' | 'Polish' | 'Content'
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
export const DEFAULT_NOTION_DATABASE_PAGE_ID = '1fc7f85d-baca-4a05-aef5-5c724ce07ecd'
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
      return 'Feature'
    case 'suggestion':
      return 'Suggestion'
    default: {
      const _exhaustive: never = type
      return _exhaustive
    }
  }
}

export function mapFeedbackTypeToPriority(type: FeedbackType): NotionIssuePriority {
  switch (type) {
    case 'bug':
      return 'High'
    case 'feature':
      return 'Medium'
    case 'suggestion':
      return 'Low'
    default: {
      const _exhaustive: never = type
      return _exhaustive
    }
  }
}

export function normalizeNotionId(value: string): string {
  const trimmed = value.trim()
  const dashed = trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  const compact = trimmed.match(/[0-9a-f]{32}/i)
  const raw = (dashed?.[0] || compact?.[0] || trimmed.replace(/[{}]/g, '')).replace(/-/g, '').toLowerCase()
  if (/^[0-9a-f]{32}$/.test(raw)) {
    return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`
  }
  return trimmed.replace(/[{}]/g, '')
}

export interface ResolvedNotionParent {
  dataSourceId?: string
  databaseId?: string
  title: string
}

function notionCandidateIds(id: string): string[] {
  const ids = [id]
  if (id === DEFAULT_NOTION_DATABASE_ID) ids.push(DEFAULT_NOTION_DATABASE_PAGE_ID)
  if (id === DEFAULT_NOTION_DATABASE_PAGE_ID) ids.push(DEFAULT_NOTION_DATABASE_ID)
  return [...new Set(ids)]
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
  const priority =
    options && 'priority' in options ? options.priority : mapFeedbackTypeToPriority(payload.type)

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

  const email = normalizeFeedbackEmail(payload.userEmail)
  if (email && isValidFeedbackEmail(email)) {
    properties.Email = { email }
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

type NotionDatabasePayload = {
  id?: string
  title?: unknown
  name?: unknown
  data_sources?: Array<{ id?: string; name?: string }>
}

async function notionGet(
  token: string,
  path: string,
  version: string
): Promise<Response> {
  return fetchWithTimeout(`${NOTION_API_BASE}${path}`, {
    method: 'GET',
    headers: notionHeaders(token, version),
  })
}

async function listVisibleNotionTitles(token: string): Promise<string[]> {
  try {
    const response = await fetchWithTimeout(`${NOTION_API_BASE}/search`, {
      method: 'POST',
      headers: notionHeaders(token, NOTION_VERSION_DATA_SOURCE),
      body: JSON.stringify({ page_size: 20 }),
    })
    if (!response.ok) return []
    const data = (await response.json()) as {
      results?: Array<{ name?: unknown; title?: unknown }>
    }
    return (data.results || [])
      .map((item) => notionObjectTitle(item))
      .filter((title) => title.length > 0)
  } catch {
    return []
  }
}

async function resolveIdAsParent(
  token: string,
  id: string
): Promise<ResolvedNotionParent | null> {
  const dataSourceResponse = await notionGet(token, `/data_sources/${id}`, NOTION_VERSION_DATA_SOURCE)
  if (dataSourceResponse.ok) {
    const data = (await dataSourceResponse.json()) as NotionDatabasePayload
    return {
      dataSourceId: data.id || id,
      title: notionObjectTitle(data) || 'Site issues',
    }
  }

  const databaseV2Response = await notionGet(token, `/databases/${id}`, NOTION_VERSION_DATA_SOURCE)
  if (databaseV2Response.ok) {
    const data = (await databaseV2Response.json()) as NotionDatabasePayload
    const dataSource = data.data_sources?.find((item) => item.id)
    return {
      dataSourceId: dataSource?.id,
      databaseId: data.id || id,
      title: dataSource?.name || notionObjectTitle(data) || 'Site issues',
    }
  }

  const databaseV1Response = await notionGet(token, `/databases/${id}`, NOTION_VERSION_DATABASE)
  if (databaseV1Response.ok) {
    const data = (await databaseV1Response.json()) as NotionDatabasePayload
    return {
      databaseId: data.id || id,
      title: notionObjectTitle(data) || 'Site issues',
    }
  }

  return null
}

export async function resolveNotionParent(
  token: string,
  rawId: string
): Promise<{ ok: true; parent: ResolvedNotionParent } | { ok: false; message: string }> {
  const id = normalizeNotionId(rawId)
  if (!token.trim()) {
    return { ok: false, message: 'Notion token is not configured' }
  }
  if (!id) {
    return { ok: false, message: 'Database or data source ID is required' }
  }

  for (const candidate of notionCandidateIds(id)) {
    const parent = await resolveIdAsParent(token.trim(), candidate)
    if (parent) return { ok: true, parent }
  }

  const visible = await listVisibleNotionTitles(token.trim())
  const visibleText = visible.length
    ? `This integration can currently see: ${visible.join(', ')}.`
    : 'This integration cannot see any databases yet.'
  return {
    ok: false,
    message:
      `Notion accepted the token, but cannot see ID ${id}. ` +
      'A new integration cannot see any pages until you grant access. ' +
      'Open https://www.notion.so/profile/integrations → The Gospel Presentation Feedback → Content access → Edit access, ' +
      'and select the Gospel Presentation page (or Site issues). ' +
      'You can also add it from Site issues → ••• → Connections. ' +
      visibleText,
  }
}

async function postNotionPage(
  token: string,
  version: string,
  parent: Record<string, string>,
  pageBody: { properties: Record<string, unknown>; children: NotionBlock[] }
): Promise<Response> {
  return fetchWithTimeout(`${NOTION_API_BASE}/pages`, {
    method: 'POST',
    headers: notionHeaders(token, version),
    body: JSON.stringify({ parent, ...pageBody }),
  })
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
  const pageBody = {
    properties: buildNotionPageProperties(payload, options),
    children: buildFeedbackPageChildren(payload),
  }

  try {
    const resolved = await resolveNotionParent(token, config.notion_database_id)
    if (!resolved.ok) {
      return { success: false, error: resolved.message }
    }

    let response: Response | null = null
    if (resolved.parent.dataSourceId) {
      response = await postNotionPage(
        token,
        NOTION_VERSION_DATA_SOURCE,
        { type: 'data_source_id', data_source_id: resolved.parent.dataSourceId },
        pageBody
      )
    }

    if (
      (!response || (!response.ok && shouldRetryAsDatabaseParent(response.status))) &&
      resolved.parent.databaseId
    ) {
      response = await postNotionPage(
        token,
        NOTION_VERSION_DATABASE,
        { type: 'database_id', database_id: resolved.parent.databaseId },
        pageBody
      )
    }

    if (!response) {
      return { success: false, error: 'Notion feedback is not configured' }
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
  try {
    const resolved = await resolveNotionParent(token, databaseId)
    if (!resolved.ok) {
      return { success: false, message: resolved.message }
    }
    const kind = resolved.parent.dataSourceId ? 'data source' : 'database'
    return {
      success: true,
      message: `Successfully connected to Notion ${kind} “${resolved.parent.title}”`,
    }
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
