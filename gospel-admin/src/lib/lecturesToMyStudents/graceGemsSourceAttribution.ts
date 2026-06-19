export const GRACE_GEMS_LTMS_SOURCE_URL =
  'https://gracegems.org/Spurgeon/lectures_to_my_student.htm'

/** Short attribution paragraph appended to the introduction subsection. */
export function graceGemsLtmsAttributionHtml(): string {
  return `<p>Text from <a href="${GRACE_GEMS_LTMS_SOURCE_URL}" rel="noopener noreferrer">Grace Gems</a> (public domain).</p>`
}
