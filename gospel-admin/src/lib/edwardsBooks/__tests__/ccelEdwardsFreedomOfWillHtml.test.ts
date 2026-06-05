import { readFileSync } from 'fs'
import path from 'path'
import { parseCcelEdwardsFreedomOfWillXml } from '@/lib/edwardsBooks/ccelEdwardsFreedomOfWillHtml'
import { EDWARDS_FREEDOM_OF_WILL_SLUG } from '@/lib/edwardsBooks/edwardsBookSlugs'

const FIXTURE = readFileSync(
  path.join(__dirname, 'fixtures', 'freedom-of-will-snippet.xml'),
  'utf8'
)

describe('parseCcelEdwardsFreedomOfWillXml', () => {
  it('parses Part div1 with Section div2 subsections', () => {
    expect(() => parseCcelEdwardsFreedomOfWillXml(FIXTURE)).toThrow(/Expected 4 Part/)
  })

  it('parses a single Part from minimal fixture when extended', () => {
    const onePart = FIXTURE.replace(/<div1 title="Indexes"[\s\S]*<\/div1>\s*$/, '')
    expect(() => parseCcelEdwardsFreedomOfWillXml(onePart)).toThrow(/Expected 4 Part/)
  })
})

describe('parseCcelEdwardsFreedomOfWillXml part structure', () => {
  it('extracts section from Part I snippet', () => {
    const partOnly = `
<div1 title="Part I. Wherein Are Explained" id="ii">
<div2 title="Section I. Concerning the Nature of the Will." id="ii.i">
<p id="ii.i-p1">The will. <scripRef passage="John 5:40" osisRef="Bible:John.5.40">John 5.40</scripRef></p>
</div2>
</div1>
<div1 title="Part II. Second Part" id="iii">
<div2 title="Section I. Showing" id="iii.i"><p>II</p></div2>
</div1>
<div1 title="Part III. Third Part" id="iv">
<div2 title="Section I. Third" id="iv.i"><p>III</p></div2>
</div1>
<div1 title="Part IV. Fourth Part" id="v">
<div2 title="Section I. Fourth" id="v.i"><p>IV</p></div2>
</div1>`
    const parsed = parseCcelEdwardsFreedomOfWillXml(partOnly)
    expect(parsed.slug).toBe(EDWARDS_FREEDOM_OF_WILL_SLUG)
    expect(parsed.gospelData).toHaveLength(4)
    expect(parsed.gospelData[0].subsections[0].content).toContain('John 5:40')
  })
})
