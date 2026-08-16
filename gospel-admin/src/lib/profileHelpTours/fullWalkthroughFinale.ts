import {
  SCRIPTURE_READER_TOUR_DEFAULT_SLUG,
  baseProfileHelpDriverConfig,
  clearFullWalkthroughStartSlug,
  createProfileHelpDriver,
  readFullWalkthroughStartSlug,
  scriptureReaderTourNavigation,
} from './tourShared'

/** Final full-walkthrough step: thank-you, then return to the profile slug stored at walkthrough start. */
export function runFullWalkthroughThankYouFinale(): void {
  const slug = readFullWalkthroughStartSlug() ?? SCRIPTURE_READER_TOUR_DEFAULT_SLUG
  clearFullWalkthroughStartSlug()
  const targetPath = `/${slug}`

  const goHome = (): void => {
    scriptureReaderTourNavigation.assign(targetPath)
  }

  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig({
      onComplete: goHome,
      onAborted: goHome,
    }),
    doneBtnText: 'Continue',
    showProgress: false,
    steps: [
      {
        element: () => document.body,
        popover: {
          title: 'Thank you',
          description:
            '<p>Thanks for watching.</p><p>May God bless your study of His Word.</p>',
          align: 'center',
        },
      },
    ],
  })

  d.drive()
}
