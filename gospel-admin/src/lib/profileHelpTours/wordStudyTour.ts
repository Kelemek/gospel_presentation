import type { Alignment, DriveStep, Side } from 'driver.js'
import type { ProfileFeatureTourOptions } from './tourShared'
import {
  MEMORIZE_TOUR_RESUME_STORAGE_KEY,
  SCRIPTURE_CARD,
  SCRIPTURE_MODAL_TOOLBAR,
  SCRIPTURE_MODAL_WORD_STUDY,
  SCRIPTURE_MODAL_WORD_STUDY_LEXICON,
  SCRIPTURE_MODAL_WORD_STUDY_OVERLAY,
  SCRIPTURE_MODAL_WORD_STUDY_PANEL,
  SCRIPTURE_READER_TOUR_DEFAULT_SLUG,
  SCRIPTURE_READER_TOUR_RESUME_STORAGE_KEY,
  ScriptureReaderTourResumePayloadV1,
  WORD_STUDY_TOUR_RESUME_STORAGE_KEY,
  baseProfileHelpDriverConfig,
  createProfileHelpDriver,
  firstWordStudyChipButton,
  isDefaultProfilePath,
  isNarrowProfileHelpTourViewport,
  modalSingleVerseViewReady,
  openWordStudyOverlayForTour,
  prependSegmentIntroIfAny,
  scriptureReaderTourNavigation,
  wordStudyLexiconHasEntryBody,
  waitUntil,
} from './tourShared'
import { getFullWalkthroughIndexAfterWordStudy } from './fullWalkthroughSegments'

export function runWordStudyFeatureTour(options?: ProfileFeatureTourOptions): void {
  if (typeof window === 'undefined') return
  if (!isDefaultProfilePath(window.location.pathname)) {
    const payload: ScriptureReaderTourResumePayloadV1 = {
      v: 1,
      captiveForTour: options?.captive === true,
      continueFullWalkthroughAt:
        options?.captive === true ? getFullWalkthroughIndexAfterWordStudy() : undefined,
      segmentIntro: options?.segmentIntro,
    }
    try {
      sessionStorage.removeItem(SCRIPTURE_READER_TOUR_RESUME_STORAGE_KEY)
      sessionStorage.removeItem(MEMORIZE_TOUR_RESUME_STORAGE_KEY)
      sessionStorage.setItem(WORD_STUDY_TOUR_RESUME_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      runWordStudyFeatureTourOnCurrentPage(options)
      return
    }
    scriptureReaderTourNavigation.assign(`/${SCRIPTURE_READER_TOUR_DEFAULT_SLUG}`)
    return
  }
  runWordStudyFeatureTourOnCurrentPage(options)
}

export function runWordStudyFeatureTourOnCurrentPage(options?: ProfileFeatureTourOptions): void {
  const narrow = isNarrowProfileHelpTourViewport()
  const pop = (
    wide: { side: Side; align: Alignment },
    narrowOverride?: { side: Side; align: Alignment }
  ): { side: Side; align: Alignment } =>
    narrow ? (narrowOverride ?? { side: 'bottom', align: 'center' }) : wide

  const steps: DriveStep[] = [
    {
      element: SCRIPTURE_CARD,
      popover: {
        title: 'Open a scripture card',
        description:
          'Blue cards open the full reader. Word study needs a <strong>verse</strong> reference (not a whole chapter alone). Use <strong>Next</strong> to open the first card for this tour.',
        ...pop({ side: 'top', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          document.querySelector<HTMLElement>(SCRIPTURE_CARD)?.click()
          void waitUntil(() => !!document.querySelector(SCRIPTURE_MODAL_TOOLBAR), 12000).then(() => {
            void waitUntil(() => modalSingleVerseViewReady(), 15000).then(() => {
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 200)
            })
          })
        },
      },
    },
    {
      element: SCRIPTURE_MODAL_WORD_STUDY,
      popover: {
        title: 'Greek or Hebrew',
        description:
          'In the reader toolbar, this button is labeled <strong>Greek</strong> (New Testament), <strong>Hebrew</strong> (most Old Testament), or <strong>Aramaic</strong> (e.g. Daniel 2:4–7:28). It only works in <strong>verse</strong> view—if you see the full <strong>Chapter</strong>, tap <strong>Verse</strong> on the toggle first. Data comes from STEP Bible (CC BY 4.0), not from your English translation. Use <strong>Next</strong> to open word study.',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          void openWordStudyOverlayForTour().then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 300)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(SCRIPTURE_MODAL_WORD_STUDY_PANEL) ??
        document.querySelector(SCRIPTURE_MODAL_WORD_STUDY_OVERLAY)!,
      popover: {
        title: 'Word study overlay',
        description:
          'This card sits over the English passage with original-language <strong>tokens</strong> for the verse (often fewer chips than English words when STEP merges prefixes and suffixes). The toolbar button stays highlighted while word study is open.',
        ...pop({ side: 'top', align: 'start' }),
      },
    },
    {
      element: () =>
        document.querySelector(SCRIPTURE_MODAL_WORD_STUDY_PANEL) ??
        document.querySelector(SCRIPTURE_MODAL_WORD_STUDY_OVERLAY)!,
      popover: {
        title: 'Word chips',
        description:
          'Each chip shows the <strong>form in the text</strong> (large Hebrew or Greek), <strong>transliteration</strong>, a short <strong>English gloss</strong>, and a <strong>Strong’s</strong> code (e.g. H3644G). These follow the verse, not the ESV/KJV wording.',
        ...pop({ side: 'top', align: 'start' }),
      },
    },
    {
      element: () => firstWordStudyChipButton() ?? document.querySelector(SCRIPTURE_MODAL_WORD_STUDY_PANEL)!,
      popover: {
        title: 'Tap a word',
        description:
          'Tap any chip to open the <strong>lexicon</strong> sheet at the bottom. Use <strong>Next</strong> to select the first word for this tour.',
        ...pop({ side: 'top', align: 'center' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          firstWordStudyChipButton()?.click()
          void waitUntil(() => wordStudyLexiconHasEntryBody(), 12000).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 200)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(SCRIPTURE_MODAL_WORD_STUDY_LEXICON) ??
        document.querySelector(SCRIPTURE_MODAL_WORD_STUDY_PANEL)!,
      popover: {
        title: 'Lexicon sheet',
        description:
          '<p>The bottom sheet shows the <strong>dictionary lemma</strong> (root form), transliteration, gloss, and definition from TBESH (Hebrew) or TBESG (Greek). The <strong>lemma</strong> may differ from the large text on the chip—that chip is the <strong>inflected form in this verse</strong> (prefixes, suffixes, and maqqef).</p>' +
          '<p class="mt-2">Greek entries can switch <strong>Brief</strong> and <strong>Full</strong> (TFLSJ when available). Hebrew uses brief TBESH only. Tap <strong>×</strong> on the sheet or the same toolbar button to close.</p>',
        ...pop({ side: 'top', align: 'center' }, { side: 'top', align: 'center' }),
      },
    },
    {
      element: SCRIPTURE_MODAL_WORD_STUDY,
      popover: {
        title: 'You are set',
        description:
          'Use <strong>Greek</strong> or <strong>Hebrew</strong> anytime you are reading a single verse. For compare mode, word study still works over the passage.',
        ...pop({ side: 'bottom', align: 'start' }),
      },
    },
  ]

  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    steps: prependSegmentIntroIfAny(options, steps),
  })
  d.drive()
}

/**
 * Scripture modal tour: opens the first scripture **card** on the page, then walks compare, verse/chapter toggle
 * (chapter view then back to the passage), next/prev arrows, optional **Pin** color (saved on close), close, pinned card,
 * per-color unpin on the card (explained only—no tap), **Menu** pinned-passage summary, and **Clear pinned passages**.
 *
 * When the reader is not already on the public **default** presentation (`/default`), this stores resume state and
 * navigates there first (`ProfilePageClient` calls `tryStartScriptureReaderTourAfterNavigation`).
 */

