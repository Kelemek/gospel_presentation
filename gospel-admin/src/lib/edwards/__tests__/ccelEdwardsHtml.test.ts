import { parseCcelEdwardsSermons } from '@/lib/edwards/ccelEdwardsHtml'
import { slugForEdwardsSermonNumber } from '@/lib/edwards/edwardsSlug'

const SERMON_SNIPPET = `
<div1 title="Sinners in the Hands of an Angry God" id="sinners">
  <p id="sinners-p2">In this verse is threatened the vengeance of God.</p>
  <p id="sinners-p7">The observation from the words that I would now insist upon is this.</p>
  <p id="sinners-p8">There is no want of <b>power</b> in God.
  <scripRef passage="Psalm 73:18" osisRef="Bible:Ps.73.18">Psalm 73:18</scripRef>.</p>
</div1>
`

const SKIP_SNIPPET = `
<div1 title="Title Page" id="i"><p id="i-p1">Cover</p></div1>
${SERMON_SNIPPET}
<div1 title="Indexes" id="xxi"><p id="xxi-p1">Index</p></div1>
`

describe('parseCcelEdwardsSermons', () => {
  it('parses sermon div1 with sequential je slug and passage keys', () => {
    const parsed = parseCcelEdwardsSermons(SKIP_SNIPPET)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].slug).toBe(slugForEdwardsSermonNumber(1))
    expect(parsed[0].sermonTitle).toBe('Sinners in the Hands of an Angry God')
    expect(parsed[0].gospelSection.subsections.length).toBeGreaterThan(0)
    expect(parsed[0].passageKeys.length).toBeGreaterThan(0)
  })

  it('skips Title Page and Indexes div1 blocks', () => {
    const parsed = parseCcelEdwardsSermons(SKIP_SNIPPET, { limit: 5 })
    expect(parsed.every((s) => s.sermonTitle !== 'Title Page' && s.sermonTitle !== 'Indexes')).toBe(
      true
    )
  })

  it('filters by --slug when provided', () => {
    const two = `
<div1 title="First Sermon"><p id="a">One.</p><p id="b">Two.</p></div1>
<div1 title="Second Sermon"><p id="c">Three.</p><p id="d">Four.</p></div1>
`
    const parsed = parseCcelEdwardsSermons(two, { slug: 'je02' })
    expect(parsed).toHaveLength(1)
    expect(parsed[0].slug).toBe('je02')
    expect(parsed[0].sermonTitle).toBe('Second Sermon')
  })
})
