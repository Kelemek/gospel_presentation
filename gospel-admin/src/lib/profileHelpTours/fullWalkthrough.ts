import type { ProfileFeatureTourOptions } from './tourShared'
import {
  FULL_WALKTHROUGH_START_SLUG_STORAGE_KEY,
  type FullWalkthroughStartSlugPayloadV1,
  MEMORIZE_TOUR_RESUME_STORAGE_KEY,
  SCRIPTURE_READER_TOUR_DEFAULT_SLUG,
  SCRIPTURE_READER_TOUR_RESUME_STORAGE_KEY,
  type ScriptureReaderTourResumePayloadV1,
  WORD_STUDY_TOUR_RESUME_STORAGE_KEY,
  clearFullWalkthroughStartSlug,
  getPresentationSlugFromPathname,
} from './tourShared'
import { runFullWalkthroughThankYouFinale } from './fullWalkthroughFinale'
import { getFullWalkthroughSegments } from './fullWalkthroughSegments'
import { runMemorizeFeatureTourOnCurrentPage } from './memorizeTour'
import { runScriptureModalFeatureTourOnCurrentPage } from './scriptureModalTour'
import { runWordStudyFeatureTourOnCurrentPage } from './wordStudyTour'

export { runFullWalkthroughThankYouFinale } from './fullWalkthroughFinale'

/** Resume the chained full walkthrough from a segment index (used after scripture reader navigates to `/default`). */
function runFullProfileHelpTutorialFromSegment(startIndex: number): void {
  const segments = getFullWalkthroughSegments()
  const runAt = (index: number): void => {
    if (index >= segments.length) return
    const isLast = index === segments.length - 1
    const { run, intro } = segments[index]
    run({
      captive: true,
      segmentIntro: intro,
      onAborted: () => {
        clearFullWalkthroughStartSlug()
      },
      onComplete: isLast
        ? () => {
            window.requestAnimationFrame(() => runFullWalkthroughThankYouFinale())
          }
        : () => {
            window.requestAnimationFrame(() => runAt(index + 1))
          },
    })
  }
  runAt(startIndex)
}

/** Runs every profile tutorial in the same order as the Help menu, one after another. */
export function runFullProfileHelpTutorial(): void {
  if (typeof window !== 'undefined') {
    try {
      const slug = getPresentationSlugFromPathname(window.location.pathname)
      sessionStorage.setItem(
        FULL_WALKTHROUGH_START_SLUG_STORAGE_KEY,
        JSON.stringify({ v: 1, slug } satisfies FullWalkthroughStartSlugPayloadV1)
      )
    } catch {
      /* quota / private mode */
    }
  }
  runFullProfileHelpTutorialFromSegment(0)
}

/** After navigation to `/default`, resumes the word study tour if `runWordStudyFeatureTour` scheduled it. */
export function tryStartWordStudyTourAfterNavigation(currentSlug: string): void {
  if (typeof window === 'undefined') return
  if (currentSlug !== SCRIPTURE_READER_TOUR_DEFAULT_SLUG) return
  const raw = sessionStorage.getItem(WORD_STUDY_TOUR_RESUME_STORAGE_KEY)
  if (!raw) return
  sessionStorage.removeItem(WORD_STUDY_TOUR_RESUME_STORAGE_KEY)
  let payload: ScriptureReaderTourResumePayloadV1
  try {
    payload = JSON.parse(raw) as ScriptureReaderTourResumePayloadV1
  } catch {
    return
  }
  if (payload.v !== 1) return
  const continueAt = payload.continueFullWalkthroughAt
  const resumeOptions: ProfileFeatureTourOptions = {
    captive: payload.captiveForTour,
    segmentIntro: payload.segmentIntro,
    onComplete:
      continueAt !== undefined
        ? () => {
            window.requestAnimationFrame(() => runFullProfileHelpTutorialFromSegment(continueAt))
          }
        : undefined,
  }
  window.requestAnimationFrame(() => {
    runWordStudyFeatureTourOnCurrentPage(resumeOptions)
  })
}

/** After navigation to `/default`, resumes the scripture reader tour if `runScriptureModalFeatureTour` scheduled it. */
export function tryStartScriptureReaderTourAfterNavigation(currentSlug: string): void {
  if (typeof window === 'undefined') return
  if (currentSlug !== SCRIPTURE_READER_TOUR_DEFAULT_SLUG) return
  const raw = sessionStorage.getItem(SCRIPTURE_READER_TOUR_RESUME_STORAGE_KEY)
  if (!raw) return
  sessionStorage.removeItem(SCRIPTURE_READER_TOUR_RESUME_STORAGE_KEY)
  let payload: ScriptureReaderTourResumePayloadV1
  try {
    payload = JSON.parse(raw) as ScriptureReaderTourResumePayloadV1
  } catch {
    return
  }
  if (payload.v !== 1) return
  const continueAt = payload.continueFullWalkthroughAt
  const resumeOptions: ProfileFeatureTourOptions = {
    captive: payload.captiveForTour,
    segmentIntro: payload.segmentIntro,
    onComplete:
      continueAt !== undefined
        ? () => {
            window.requestAnimationFrame(() => runFullProfileHelpTutorialFromSegment(continueAt))
          }
        : undefined,
  }
  window.requestAnimationFrame(() => {
    runScriptureModalFeatureTourOnCurrentPage(resumeOptions)
  })
}

/** After navigation to `/default`, resumes the verse memorization tour if `runMemorizeFeatureTour` scheduled it. */
export function tryStartMemorizeTourAfterNavigation(currentSlug: string): void {
  if (typeof window === 'undefined') return
  if (currentSlug !== SCRIPTURE_READER_TOUR_DEFAULT_SLUG) return
  const raw = sessionStorage.getItem(MEMORIZE_TOUR_RESUME_STORAGE_KEY)
  if (!raw) return
  sessionStorage.removeItem(MEMORIZE_TOUR_RESUME_STORAGE_KEY)
  let payload: ScriptureReaderTourResumePayloadV1
  try {
    payload = JSON.parse(raw) as ScriptureReaderTourResumePayloadV1
  } catch {
    return
  }
  if (payload.v !== 1) return
  const continueAt = payload.continueFullWalkthroughAt
  const resumeOptions: ProfileFeatureTourOptions = {
    captive: payload.captiveForTour,
    segmentIntro: payload.segmentIntro,
    onComplete:
      continueAt !== undefined
        ? () => {
            window.requestAnimationFrame(() => runFullProfileHelpTutorialFromSegment(continueAt))
          }
        : undefined,
  }
  window.requestAnimationFrame(() => {
    runMemorizeFeatureTourOnCurrentPage(resumeOptions)
  })
}
