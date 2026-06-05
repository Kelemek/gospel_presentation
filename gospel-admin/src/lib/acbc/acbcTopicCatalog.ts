/** ACBC topic-index entry (slug on biblicalcounseling.com). */
export type AcbcTopic = {
  slug: string
  /** Display label from ACBC (may include parenthetical notes). */
  label: string
}

/** Profile section title → one or more ACBC topic-index slugs (merged, de-duplicated by URL). */
export const SECTION_TO_ACBC_SLUGS: Record<string, string[]> = {
  Anger: ['anger'],
  'Anxiety and Worry': ['anxiety'],
  Depression: ['depression-despair'],
  Fear: ['anxiety', 'post-traumatic-stress', 'crisis'],
  'God is Worthy': ['gospel', 'sufficiency', 'faith', 'spiritual-growth'],
  'Guilt and shame': ['guilt-shame'],
  Marriage: ['marriage'],
  Parenting: ['parenting'],
  Suffering: ['suffering'],
  'Addictions and Temptation': ['addiction-bondage', 'temptation'],
  Forgiveness: ['forgiveness'],
  'Grief and Loss': ['grief'],
  Loneliness: ['relationships', 'family'],
  'Pride and Humility': ['sanctification', 'sin'],
  'Conflict and Reconciliation': ['conflict'],
  // Topics added as dedicated profile sections (1:1 slug)
  Abortion: ['abortion-typical-issues'],
  Abuse: ['abuse'],
  Adultery: ['adultery'],
  'Biblical counseling and psychology': ['biblical-counseling-and-psychology'],
  Body: ['body'],
  Children: ['children'],
  Church: ['church'],
  Communication: ['communication'],
  'Counseling methodology': ['counseling-methodology'],
  'Counseling practice': ['counseling-practice'],
  Dating: ['dating'],
  'Death and dying': ['death-and-dying'],
  Discipleship: ['discipleship'],
  Emotions: ['emotions'],
  'Gender roles': ['gender-roles'],
  'How to begin a counseling center': ['how-to-begin-a-counseling-center'],
  Illness: ['illness'],
  Laziness: ['laziness'],
  'Legal issues in counseling': ['legal-issues-in-counseling'],
  'Medical issues': ['medical-issues'],
  'Mental health': ['mental-health'],
  'Pastoral care': ['pastoral-care'],
  'Psychological theories': ['psychological-theories'],
  Repentance: ['repentance'],
  Scripture: ['scripture'],
  'Sexual sin': ['sexual-sin'],
  Sexuality: ['sexuality'],
  Singleness: ['singleness'],
  'Spiritual disciplines': ['spiritual-disciplines'],
  'Spiritual warfare': ['spiritual-warfare'],
  'Suicide and self-harm': ['suicide-self-harm'],
  Theology: ['theology'],
  'Typical issues': ['typical-issues'],
}

/** Slugs already covered by an existing primary section (do not add a duplicate section). */
export const ACBC_SLUGS_IN_COMPOSITE_SECTIONS_ONLY = new Set([
  'addiction-bondage',
  'temptation',
  'crisis',
  'faith',
  'family',
  'gospel',
  'post-traumatic-stress',
  'relationships',
  'sanctification',
  'sin',
  'spiritual-growth',
  'sufficiency',
])

/** Topics to add as new profile sections when running add-missing-sections. */
export const ACBC_TOPICS_TO_ADD_AS_SECTIONS: AcbcTopic[] = [
  { slug: 'abortion-typical-issues', label: 'Abortion (typical issues)' },
  { slug: 'abuse', label: 'Abuse' },
  { slug: 'adultery', label: 'Adultery' },
  { slug: 'biblical-counseling-and-psychology', label: 'Biblical counseling and psychology' },
  { slug: 'body', label: 'Body' },
  { slug: 'children', label: 'Children' },
  { slug: 'church', label: 'Church' },
  { slug: 'communication', label: 'Communication' },
  { slug: 'counseling-methodology', label: 'Counseling methodology' },
  { slug: 'counseling-practice', label: 'Counseling practice' },
  { slug: 'dating', label: 'Dating' },
  { slug: 'death-and-dying', label: 'Death and dying' },
  { slug: 'discipleship', label: 'Discipleship' },
  { slug: 'emotions', label: 'Emotions' },
  { slug: 'gender-roles', label: 'Gender roles' },
  { slug: 'how-to-begin-a-counseling-center', label: 'How to begin a counseling center' },
  { slug: 'illness', label: 'Illness' },
  { slug: 'laziness', label: 'Laziness' },
  { slug: 'legal-issues-in-counseling', label: 'Legal issues in counseling' },
  { slug: 'medical-issues', label: 'Medical issues' },
  { slug: 'mental-health', label: 'Mental health' },
  { slug: 'pastoral-care', label: 'Pastoral care' },
  { slug: 'psychological-theories', label: 'Psychological theories' },
  { slug: 'repentance', label: 'Repentance' },
  { slug: 'scripture', label: 'Scripture' },
  { slug: 'sexual-sin', label: 'Sexual sin' },
  { slug: 'sexuality', label: 'Sexuality' },
  { slug: 'singleness', label: 'Singleness' },
  { slug: 'spiritual-disciplines', label: 'Spiritual disciplines' },
  { slug: 'spiritual-warfare', label: 'Spiritual warfare' },
  { slug: 'suicide-self-harm', label: 'Suicide / self-harm' },
  { slug: 'theology', label: 'Theology' },
  { slug: 'typical-issues', label: 'Typical issues' },
]

export function sectionTitleForAcbcTopic(topic: AcbcTopic): string {
  const fromMap = Object.entries(SECTION_TO_ACBC_SLUGS).find(
    ([, slugs]) => slugs.length === 1 && slugs[0] === topic.slug
  )?.[0]
  if (fromMap) return fromMap
  return topic.label
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/\s*\/\s*/g, ' and ')
    .trim()
}

export function findAcbcSlugsForSectionTitle(sectionTitle: string): string[] | 'curated' | null {
  const trimmed = (sectionTitle || '').trim()
  if (!trimmed) return null
  if (trimmed.toLowerCase() === 'election') return 'curated'

  const exact = SECTION_TO_ACBC_SLUGS[trimmed]
  if (exact) return exact

  const lower = trimmed.toLowerCase()
  for (const [key, slugs] of Object.entries(SECTION_TO_ACBC_SLUGS)) {
    if (key.toLowerCase() === lower) return slugs
  }
  return null
}
