/** Public template slug for Spurgeon *Lectures to My Students* (Grace Gems First Series). */
export const LECTURES_TO_MY_STUDENTS_SLUG = 'ltms'

export function lecturesToMyStudentsProfileTitle(): string {
  return 'Lectures to My Students (C.H. Spurgeon)'
}

export function isLecturesToMyStudentsProfileSlug(slug: string): boolean {
  return slug.trim().toLowerCase() === LECTURES_TO_MY_STUDENTS_SLUG
}
