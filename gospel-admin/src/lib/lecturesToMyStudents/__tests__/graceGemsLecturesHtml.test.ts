import { decodeGraceGemsLecturesHtmlBytes, parseGraceGemsLecturesHtml } from '@/lib/lecturesToMyStudents/graceGemsLecturesHtml'

const MINIMAL_HTML = `<html><head><meta charset=windows-1252></head><body>
<p>Lectures to My Students</p>
<p>Charles Spurgeon</p>
<p>Lectures to My Students: A Selection from Addresses.</p>
<p>INTRODUCTION AND APOLOGY.</p>
<p>Intro paragraph one.</p>
<p>Chapter 1. The Minister's Self-watch</p>
<p>"Take heed." 1 Timothy 4:16</p>
<p>1. It should be our first care.</p>
<p>Body under outline (Romans 8:28).</p>
</body></html>`

describe('graceGemsLecturesHtml parse', () => {
  it('decodeGraceGemsLecturesHtmlBytes reads windows-1252 em dashes', () => {
    const bytes = Buffer.from([0x53, 0x65, 0x72, 0x6d, 0x6f, 0x6e, 0x73, 0x97, 0x74])
    expect(decodeGraceGemsLecturesHtmlBytes(bytes)).toBe('Sermons\u2014t')
  })

  it('parseGraceGemsLecturesHtml splits intro and chapter from minimal HTML', () => {
    const data = parseGraceGemsLecturesHtml(MINIMAL_HTML, { expectedChapterCount: 1 })
    expect(data.introduction).toEqual(['Intro paragraph one.'])
    expect(data.chapters).toHaveLength(1)
    expect(data.chapters[0].title).toBe("The Minister's Self-watch")
    expect(data.chapters[0].paragraphs[0]).toContain('1 Timothy 4:16')
    expect(data.chapters[0].paragraphs.some((p) => p.startsWith('1. It should'))).toBe(true)
  })
})
