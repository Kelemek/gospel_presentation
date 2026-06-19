import { isLecturesToMyStudentsProfileSlug } from '@/lib/lecturesToMyStudents/lecturesToMyStudentsSlug'

describe('lecturesToMyStudentsSlug', () => {
  it('matches ltms slug', () => {
    expect(isLecturesToMyStudentsProfileSlug('ltms')).toBe(true)
    expect(isLecturesToMyStudentsProfileSlug('LTMS')).toBe(true)
    expect(isLecturesToMyStudentsProfileSlug('aogr')).toBe(false)
  })
})
