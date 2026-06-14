import {
  commitSubjectToChangelogMessage,
  isUserVisibleGospelAdminCommit,
  parseConventionalCommitType,
} from '@/lib/commitMessageToChangelog'

describe('commitMessageToChangelog', () => {
  it('prefixes fix commits with Bug fix:', () => {
    expect(
      commitSubjectToChangelogMessage(
        'fix(gospel-admin): scripture reader layout on phones'
      )
    ).toBe('Bug fix: Scripture reader layout on phones.')
  })

  it('capitalizes feat commits without Bug fix prefix', () => {
    expect(
      commitSubjectToChangelogMessage(
        'feat(gospel-admin): add Daily Verse Hunt feature to profile pages'
      )
    ).toBe('Add Daily Verse Hunt feature to profile pages.')
  })

  it('skips deploy changelog meta commits', () => {
    expect(
      commitSubjectToChangelogMessage(
        'fix(gospel-admin): clarify deploy update messaging and enhance user instructions'
      )
    ).toBeNull()
  })

  it('parses conventional commit types', () => {
    expect(parseConventionalCommitType('feat(gospel-admin): foo')).toBe('feat')
    expect(parseConventionalCommitType('fix(gospel-admin): bar')).toBe('fix')
    expect(parseConventionalCommitType('chore: bump deps')).toBeNull()
  })

  it('detects user-visible feat/fix commits across scopes', () => {
    expect(
      isUserVisibleGospelAdminCommit(
        'feat(gospel-admin): enhance Bible Reader functionality with tab restoration'
      )
    ).toBe(true)
    expect(
      isUserVisibleGospelAdminCommit(
        'feat(memorization): introduce Initials practice mode for enhanced memorization'
      )
    ).toBe(true)
    expect(
      isUserVisibleGospelAdminCommit(
        'feat(read-aloud): enhance read-aloud functionality with smooth scrolling and word tracking'
      )
    ).toBe(true)
    expect(isUserVisibleGospelAdminCommit('feat: add centralized logger system')).toBe(true)
    expect(
      isUserVisibleGospelAdminCommit('chore(gospel-admin): update knip config')
    ).toBe(false)
  })
})
