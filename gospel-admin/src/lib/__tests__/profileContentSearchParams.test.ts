import { parseProfileContentSearchParams } from '@/lib/profileContentSearchParams'

describe('parseProfileContentSearchParams', () => {
  it('returns empty strings when params are absent', () => {
    expect(parseProfileContentSearchParams(new URLSearchParams())).toEqual({
      studyRefParam: '',
      scriptureRefParam: '',
      scriptureViewParam: '',
      translationParam: '',
      mcheynePlanDayParam: '',
      mcheyneResumePinParam: '',
    })
  })

  it('normalizes scripture ref en-dashes and translation casing', () => {
    const params = new URLSearchParams(
      'scriptureRef=Romans+8%E2%80%931&translation=ESV&scriptureView=chapter'
    )
    expect(parseProfileContentSearchParams(params)).toMatchObject({
      scriptureRefParam: 'Romans 8-1',
      translationParam: 'esv',
      scriptureViewParam: 'chapter',
    })
  })

  it('trims study and M\'Cheyne params', () => {
    const params = new URLSearchParams(
      'studyRef=+John+3%3A16+&planDay=+42+&resumePin=+family+'
    )
    expect(parseProfileContentSearchParams(params)).toEqual({
      studyRefParam: 'John 3:16',
      scriptureRefParam: '',
      scriptureViewParam: '',
      translationParam: '',
      mcheynePlanDayParam: '42',
      mcheyneResumePinParam: 'family',
    })
  })
})
