import {
  isRunningHeaderLine,
  linesToParagraphs,
  mergeOrphanContinuations,
  paragraphsFromPdfLines,
} from '@/lib/pinkAttributes/pinkAttributesPdfText'

describe('pinkAttributesPdfText', () => {
  it('joins page-break splits across blank lines and page numbers', () => {
    const lines = [
      'in any way, they also had been',
      '',
      ' ',
      '3 ',
      'called into existence from all eternity. He changes not.',
    ]
    expect(paragraphsFromPdfLines(lines)).toEqual([
      'in any way, they also had been called into existence from all eternity. He changes not.',
    ])
  })

  it('joins split words across page breaks', () => {
    const lines = [
      'but the thunder of His',
      '',
      '4 ',
      'power who can understand?” (26:14). The argument continues.',
    ]
    expect(paragraphsFromPdfLines(lines)).toEqual([
      'but the thunder of His power who can understand?” (26:14). The argument continues.',
    ])
  })

  it('drops running headers duplicated in the next line', () => {
    expect(
      isRunningHeaderLine(
        'Properties of divine decrees',
        'Let us now consider some of the properties of the divine decrees. First, they are eternal.'
      )
    ).toBe(true)

    const lines = [
      'the fall of a hair.',
      'Properties of divine decrees',
      'Let us now consider some of the properties of the divine decrees. First, they are eternal.',
    ]
    expect(paragraphsFromPdfLines(lines)).toEqual([
      'the fall of a hair.',
      'Let us now consider some of the properties of the divine decrees. First, they are eternal.',
    ])
  })

  it('keeps real section subheadings as their own paragraph', () => {
    const lines = [
      'His essential glory can be neither augmented nor diminished.',
      'His sovereign will',
      'God was under no constraint, no obligation, no necessity to create.',
    ]
    expect(paragraphsFromPdfLines(lines)).toEqual([
      'His essential glory can be neither augmented nor diminished.',
      'His sovereign will',
      'God was under no constraint, no obligation, no necessity to create.',
    ])
  })

  it('mergeOrphanContinuations repairs leftover lowercase starts', () => {
    expect(
      mergeOrphanContinuations([
        'they also had been',
        'called into existence from all eternity.',
      ])
    ).toEqual(['they also had been called into existence from all eternity.'])
  })

  it('does not merge paragraphs that properly end sentences', () => {
    const lines = ['First sentence ends here.', '', 'Second sentence starts here.']
    expect(linesToParagraphs(lines)).toEqual([
      'First sentence ends here.',
      'Second sentence starts here.',
    ])
  })
})
