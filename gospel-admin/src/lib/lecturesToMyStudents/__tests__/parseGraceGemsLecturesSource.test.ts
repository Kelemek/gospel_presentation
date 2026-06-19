import * as fs from 'fs'
import * as path from 'path'
import { paragraphInnerToPlain } from '@/lib/lecturesToMyStudents/graceGemsLecturesHtml'
import {
  buildLecturesToMyStudentsChapterSubsection,
  parseGraceGemsLecturesJson,
  parseGraceGemsLecturesSource,
} from '@/lib/lecturesToMyStudents/parseGraceGemsLecturesSource'
import { LECTURES_TO_MY_STUDENTS_SLUG } from '@/lib/lecturesToMyStudents/lecturesToMyStudentsSlug'

const FIXTURE = path.join(__dirname, 'fixtures/lectures-to-my-students-snippet.json')

describe('graceGemsLecturesHtml', () => {
  it('paragraphInnerToPlain strips tags and decodes entities', () => {
    expect(paragraphInnerToPlain('&quot;Hello&quot; <i>world</i>.')).toBe('"Hello" world .')
  })
})

describe('parseGraceGemsLecturesSource', () => {
  it('parses introduction and flat chapters with bold outline lines and scripture refs', () => {
    const raw = fs.readFileSync(FIXTURE, 'utf8')
    const data = JSON.parse(raw)
    const parsed = parseGraceGemsLecturesSource(data)

    expect(parsed.slug).toBe(LECTURES_TO_MY_STUDENTS_SLUG)
    expect(parsed.gospelSection.subsections).toHaveLength(2)
    expect(parsed.gospelSection.subsections[0].title).toBe('Introduction and Apology')
    expect(parsed.gospelSection.subsections[0].content).toContain('gracegems.org')
    expect(parsed.gospelSection.subsections[1].title).toBe("Chapter 1: The Minister's Self-watch")
    expect(parsed.gospelSection.subsections[1].content).toContain('1 Timothy 4:16')
    expect(parsed.gospelSection.subsections[1].nestedSubsections).toBeUndefined()
    expect(parsed.gospelSection.subsections[1].content).toContain(
      '<strong>1. It should be our first care that we ourselves be saved men.</strong>'
    )
    expect(parsed.gospelSection.subsections[1].content).toContain('Daniel 12:3')
    expect(parsed.passageKeys.length).toBeGreaterThan(0)
    expect(parsed.passageKeys).toEqual(expect.arrayContaining(['1TI.4.16', 'DAN.12.3']))
  })

  it('buildLecturesToMyStudentsChapterSubsection keeps one flat subsection per chapter', () => {
    const sub = buildLecturesToMyStudentsChapterSubsection({
      number: 2,
      title: 'The Call to the Ministry',
      paragraphs: ['Only body text here (Romans 8:28).'],
    })
    expect(sub.nestedSubsections).toBeUndefined()
    expect(sub.content).toContain('Romans 8:28')
  })

  it('finalizeGospelDataForImport normalizes inline refs', () => {
    const raw = fs.readFileSync(FIXTURE, 'utf8')
    const { finalized } = parseGraceGemsLecturesJson(raw)
    const html = finalized.gospelData[0].subsections[1].content
    expect(html).toContain('1 Timothy 4:16')
    expect(html).toContain('Daniel 12:3')
    expect(finalized.passageKeys).toEqual(expect.arrayContaining(['1TI.4.16', 'DAN.12.3']))
  })
})
