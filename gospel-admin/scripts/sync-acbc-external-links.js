#!/usr/bin/env node
/**
 * Fetch ACBC topic-index resources and attach externalResourceLinks to profile sections.
 *
 * Usage (from gospel-admin/):
 *   node scripts/sync-acbc-external-links.js [--slug 26b974ef] [--dry-run]
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const PROFILE_SLUG = process.argv.includes('--slug')
  ? process.argv[process.argv.indexOf('--slug') + 1]
  : '26b974ef'
const DRY_RUN = process.argv.includes('--dry-run')

/** Profile section title → ACBC topic-index slug(s). null = no auto-match. */
const SECTION_TO_ACBC_SLUGS = {
  Anger: ['anger'],
  'Anxiety and Worry': ['anxiety'],
  Depression: ['depression-despair'],
  'Guilt and shame': ['guilt-shame'],
  Marriage: ['marriage'],
  Parenting: ['parenting'],
  Suffering: ['suffering'],
  'Addictions and Temptation': ['addiction-bondage', 'temptation'],
  Forgiveness: ['forgiveness'],
  'Grief and Loss': ['grief'],
  'Conflict and Reconciliation': ['conflict'],
}

const UNMATCHED_PROFILE_SECTIONS = [
  'Election',
  'Fear',
  'God is Worthy',
  'Loneliness',
  'Pride and Humility',
]

/** ACBC topics with no matching profile section (for user to consider adding). */
const UNMATCHED_ACBC_TOPICS = [
  { slug: 'abortion-typical-issues', label: 'Abortion (typical issues)' },
  { slug: 'abuse', label: 'Abuse' },
  { slug: 'addiction-bondage', label: 'Addiction & bondage (also on your Addictions section)' },
  { slug: 'adultery', label: 'Adultery' },
  { slug: 'biblical-counseling-and-psychology', label: 'Biblical counseling and psychology' },
  { slug: 'body', label: 'Body' },
  { slug: 'children', label: 'Children' },
  { slug: 'church', label: 'Church' },
  { slug: 'communication', label: 'Communication' },
  { slug: 'counseling-methodology', label: 'Counseling methodology' },
  { slug: 'counseling-practice', label: 'Counseling practice' },
  { slug: 'crisis', label: 'Crisis' },
  { slug: 'dating', label: 'Dating' },
  { slug: 'death-and-dying', label: 'Death and dying' },
  { slug: 'discipleship', label: 'Discipleship' },
  { slug: 'emotions', label: 'Emotions' },
  { slug: 'faith', label: 'Faith' },
  { slug: 'family', label: 'Family' },
  { slug: 'gender-roles', label: 'Gender roles' },
  { slug: 'gospel', label: 'Gospel' },
  { slug: 'how-to-begin-a-counseling-center', label: 'How to begin a counseling center' },
  { slug: 'illness', label: 'Illness' },
  { slug: 'laziness', label: 'Laziness' },
  { slug: 'legal-issues-in-counseling', label: 'Legal issues in counseling' },
  { slug: 'medical-issues', label: 'Medical issues' },
  { slug: 'mental-health', label: 'Mental health' },
  { slug: 'pastoral-care', label: 'Pastoral care' },
  { slug: 'post-traumatic-stress', label: 'Post-traumatic stress' },
  { slug: 'psychological-theories', label: 'Psychological theories' },
  { slug: 'relationships', label: 'Relationships (possible fit for Loneliness)' },
  { slug: 'repentance', label: 'Repentance' },
  { slug: 'sanctification', label: 'Sanctification (possible fit for Pride and Humility)' },
  { slug: 'scripture', label: 'Scripture' },
  { slug: 'sexual-sin', label: 'Sexual sin' },
  { slug: 'sexuality', label: 'Sexuality' },
  { slug: 'sin', label: 'Sin' },
  { slug: 'singleness', label: 'Singleness' },
  { slug: 'spiritual-disciplines', label: 'Spiritual disciplines' },
  { slug: 'spiritual-growth', label: 'Spiritual growth' },
  { slug: 'spiritual-warfare', label: 'Spiritual warfare' },
  { slug: 'sufficiency', label: 'Sufficiency (possible fit for God is Worthy)' },
  { slug: 'suicide-self-harm', label: 'Suicide / self-harm' },
  { slug: 'temptation', label: 'Temptation (also on your Addictions section)' },
  { slug: 'theology', label: 'Theology (possible fit for Election)' },
  { slug: 'typical-issues', label: 'Typical issues' },
]

function decodeHtmlEntities(text) {
  return text
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, '–')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugToTopicLabel(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'gospel-presentation-sync/1.0' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

function parseResourceLinks(html) {
  const re =
    /<h3>\s*<a href="(https:\/\/biblicalcounseling\.com\/resource-library\/(?:articles|podcast-episodes|conference-messages|recommended-books)\/[^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>/gi
  const byUrl = new Map()
  let m
  while ((m = re.exec(html)) !== null) {
    const url = m[1].replace(/\/$/, '') + '/'
    const label = decodeHtmlEntities(m[2].replace(/<[^>]+>/g, ''))
    if (label && !byUrl.has(url)) byUrl.set(url, label)
  }
  return [...byUrl.entries()].map(([url, label]) => ({ label, url }))
}

async function fetchTopicExternalLinks(slug) {
  const indexUrl = `https://biblicalcounseling.com/resource-library/topic-index/${slug}/`
  const html = await fetchHtml(indexUrl)
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const topicTitle = h1Match
    ? decodeHtmlEntities(h1Match[1].replace(/<[^>]+>/g, ''))
    : slugToTopicLabel(slug)

  const links = [
    {
      label: `ACBC: ${topicTitle} (topic index)`,
      url: indexUrl,
    },
    ...parseResourceLinks(html),
  ]
  return links
}

async function fetchLinksForSection(slugs) {
  const seen = new Set()
  const merged = []
  for (const slug of slugs) {
    const batch = await fetchTopicExternalLinks(slug)
    for (const link of batch) {
      if (seen.has(link.url)) continue
      seen.add(link.url)
      merged.push(link)
    }
  }
  return merged
}

function normalizeSectionTitle(title) {
  return (title || '').trim()
}

function findMapping(sectionTitle) {
  const exact = SECTION_TO_ACBC_SLUGS[sectionTitle]
  if (exact) return exact
  const lower = sectionTitle.toLowerCase()
  for (const [key, slugs] of Object.entries(SECTION_TO_ACBC_SLUGS)) {
    if (key.toLowerCase() === lower) return slugs
  }
  return null
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase env vars')
    process.exit(1)
  }

  const sb = createClient(supabaseUrl, supabaseServiceKey)
  const { data: profile, error } = await sb
    .from('profiles')
    .select('id, title, gospel_data')
    .eq('slug', PROFILE_SLUG)
    .single()

  if (error || !profile) {
    console.error('Profile not found:', PROFILE_SLUG, error)
    process.exit(1)
  }

  console.log(`Profile: ${profile.title} (${PROFILE_SLUG})`)
  if (DRY_RUN) console.log('DRY RUN — no database writes\n')

  const gospelData = profile.gospel_data
  const summary = []

  for (const section of gospelData) {
    const title = normalizeSectionTitle(section.title)
    const slugs = findMapping(title)

    if (!slugs) {
      summary.push({ title, status: 'skipped', count: 0 })
      continue
    }

    if (title === 'Anger' && section.subsections?.[0]?.externalResourceLinks?.length > 1) {
      summary.push({
        title,
        status: 'skipped (already populated)',
        count: section.subsections[0].externalResourceLinks.length,
      })
      continue
    }

    process.stdout.write(`Fetching ACBC links for "${title}"… `)
    const links = await fetchLinksForSection(slugs)
    console.log(`${links.length} links`)

    if (section.subsections?.[0]) {
      section.subsections[0].externalResourceLinks = links
    }
    summary.push({ title, status: 'updated', count: links.length })
  }

  if (!DRY_RUN) {
    const { error: updateErr } = await sb
      .from('profiles')
      .update({ gospel_data: gospelData })
      .eq('id', profile.id)
    if (updateErr) {
      console.error('Update failed:', updateErr)
      process.exit(1)
    }
    console.log('\nSaved gospel_data to Supabase.')
  }

  console.log('\n=== Sections updated ===')
  for (const row of summary.filter((r) => r.status === 'updated')) {
    console.log(`  ${row.title}: ${row.count} links`)
  }

  console.log('\n=== Your profile sections with NO ACBC topic match (add manually if desired) ===')
  for (const name of UNMATCHED_PROFILE_SECTIONS) {
    const hints = {
      Election: 'Consider: theology, gospel, faith, sanctification',
      Fear: 'Consider: anxiety (overlap), post-traumatic-stress, crisis',
      'God is Worthy': 'Consider: gospel, sufficiency, faith, spiritual growth',
      Loneliness: 'Consider: relationships, family',
      'Pride and Humility': 'Consider: sanctification, sin',
    }
    console.log(`  • ${name} — ${hints[name] || ''}`)
  }

  console.log('\n=== ACBC topic index categories NOT on your profile (pick any to add as new sections) ===')
  for (const t of UNMATCHED_ACBC_TOPICS) {
    console.log(`  • ${t.label} — https://biblicalcounseling.com/resource-library/topic-index/${t.slug}/`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
