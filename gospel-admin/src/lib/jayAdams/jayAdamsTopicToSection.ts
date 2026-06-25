/** Maps Jay Adams worklist topic titles to Biblical Counseling profile section title(s). */

export type JayAdamsTopicRoute =
  | { kind: 'section'; sectionTitle: string }
  | { kind: 'split'; routes: { sectionTitle: string; lines: string[] }[] }
  | { kind: 'skip' }

const EXISTING_SECTION_MAP: Record<string, string> = {
  Adultery: 'Adultery',
  Anger: 'Anger',
  Body: 'Body',
  Church: 'Church',
  Communication: 'Communication',
  Death: 'Death and dying',
  Depression: 'Depression',
  Drunkenness: 'Addictions and temptation',
  Fear: 'Fear',
  Forgiveness: 'Forgiveness',
  Grief: 'Grief and loss',
  Homosexuality: 'Sexual sin',
  Humility: 'Pride and humility',
  Pride: 'Pride and humility',
  Reconciliation: 'Conflict and reconciliation',
  Repentance: 'Repentance',
  Sexuality: 'Sexuality',
  Shame: 'Guilt and shame',
  Worry: 'Anxiety and Worry',
}

const NEW_SECTION_TITLES: Record<string, string> = {
  'Associations (bad/good)': 'Associations (bad/good)',
  Assurance: 'Assurance',
  Avoidance: 'Avoidance',
  'Blame Shifting': 'Blame shifting',
  Change: 'Change',
  Commandment: 'Commandments',
  Confession: 'Confession',
  Conscience: 'Conscience',
  Conviction: 'Conviction',
  'Decision Making': 'Decision making',
  Desire: 'Desire',
  Discipline: 'Discipline',
  Divorce: 'Divorce',
  Doubt: 'Doubt',
  Envy: 'Envy',
  Friendship: 'Friendship',
  Gifts: 'Gifts',
  Gossip: 'Gossip',
  Habit: 'Habit',
  Hope: 'Hope',
  Imitation: 'Imitation',
  Judging: 'Judging',
  Laziness: 'Laziness',
  Lying: 'Lying',
  'Life-dominating Problems': 'Life-dominating problems',
  Listening: 'Listening',
  Love: 'Love',
  Motives: 'Motives',
  Obedience: 'Obedience',
  Peace: 'Peace',
  Resentment: 'Resentment',
  'Reward/Punishment': 'Reward/Punishment',
  Scheduling: 'Scheduling',
  Stealing: 'Stealing',
  Strength: 'Strength',
  Work: 'Work',
}

const CROSS_REF_ONLY = new Set([
  'Alcoholism',
  'Anxiety',
  'Bitterness',
  'Children',
  'Father',
  'Jealousy',
  'Lust',
  'Mother',
  'Put-off/Put-on',
  'Slander',
])

const FAMILY_MARRIAGE_LINES = new Set(['Gen 2:18, 24'])
const FAMILY_PARENTING_LINES = new Set(['Ex 20:12'])

export function profileSectionTitleForJayAdamsTopic(topicTitle: string): string | null {
  if (CROSS_REF_ONLY.has(topicTitle)) return null
  if (topicTitle === 'Family') return null
  if (topicTitle === 'A. Husband/Wife') return 'Marriage'
  if (topicTitle === 'B. Parent/Child') return 'Parenting'

  const existing = EXISTING_SECTION_MAP[topicTitle]
  if (existing) return existing

  const created = NEW_SECTION_TITLES[topicTitle]
  if (created) return created

  return null
}

export function routeJayAdamsTopic(
  topicTitle: string,
  lines: string[] = []
): JayAdamsTopicRoute {
  if (CROSS_REF_ONLY.has(topicTitle)) return { kind: 'skip' }

  if (topicTitle === 'A. Husband/Wife' || topicTitle === 'B. Parent/Child') {
    const sectionTitle = profileSectionTitleForJayAdamsTopic(topicTitle)!
    return { kind: 'section', sectionTitle }
  }

  if (topicTitle === 'Family') {
    const marriageLines = lines.filter((l) => FAMILY_MARRIAGE_LINES.has(l.trim()))
    const parentingLines = lines.filter((l) => FAMILY_PARENTING_LINES.has(l.trim()))
    return {
      kind: 'split',
      routes: [
        { sectionTitle: 'Marriage', lines: marriageLines },
        { sectionTitle: 'Parenting', lines: parentingLines },
      ],
    }
  }

  const sectionTitle = profileSectionTitleForJayAdamsTopic(topicTitle)
  if (!sectionTitle) return { kind: 'skip' }
  return { kind: 'section', sectionTitle }
}

/** All profile section titles that the worklist import may create if missing. */
export function jayAdamsNewSectionTitles(): string[] {
  const titles = new Set<string>()
  for (const title of Object.values(NEW_SECTION_TITLES)) titles.add(title)
  titles.add('Resentment')
  return [...titles].sort((a, b) => a.localeCompare(b))
}

export function jayAdamsAllTargetSectionTitles(): string[] {
  const titles = new Set<string>([
    ...Object.values(EXISTING_SECTION_MAP),
    ...Object.values(NEW_SECTION_TITLES),
    'Marriage',
    'Parenting',
  ])
  return [...titles].sort((a, b) => a.localeCompare(b))
}
