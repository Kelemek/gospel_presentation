import { isProfileResourceListenControlAvailable } from '@/lib/profileListenAvailability'
import type { ProfileFeatureTourOptions } from './tourShared'
import { runAddCustomMemorizationFeatureTour } from './addCustomMemorizationTour'
import { runBookmarksFeatureTour } from './bookmarksTour'
import { runBibleTranslationFeatureTour } from './bibleTranslationTour'
import { runHighlightsFeatureTour } from './highlightsTour'
import { runProfileListenFeatureTour } from './listenTour'
import { runMarriageSeminarResourcesTour } from './marriageSeminarTour'
import { runMemorizeFeatureTour } from './memorizeTour'
import { runPrintFeatureTour } from './printTour'
import { runResourcesFeatureTour } from './resourcesTour'
import { runScriptureHoverPreviewFeatureTour } from './scriptureHoverPreviewTour'
import { runScriptureModalFeatureTour } from './scriptureModalTour'
import { runShareResourceFeatureTour } from './shareResourceTour'
import { runTableOfContentsFeatureTour } from './tableOfContentsTour'
import { runTextSizeFeatureTour } from './textSizeTour'
import { runThemeFeatureTour } from './themeTour'
import { runWordStudyFeatureTour } from './wordStudyTour'

type FullProfileWalkthroughSegment = {
  run: (opts?: ProfileFeatureTourOptions) => void
  intro: { title: string; description: string }
}

const FULL_WALKTHROUGH_SEGMENTS_FROM_RESOURCES: FullProfileWalkthroughSegment[] = [
  {
    run: runResourcesFeatureTour,
    intro: {
      title: 'Resources menu',
      description:
        'Shared presentations from your church: top-level links, category folders, and how to open another profile.',
    },
  },
  {
    run: runTableOfContentsFeatureTour,
    intro: {
      title: 'Table of contents',
      description: 'Jump to any main section or subsection of this presentation from the slide-out menu.',
    },
  },
  {
    run: runTextSizeFeatureTour,
    intro: {
      title: 'Text size',
      description: 'Make on-screen reading normal, larger, or largest; your choice is remembered in this browser.',
    },
  },
  {
    run: runPrintFeatureTour,
    intro: {
      title: 'Print version',
      description: 'A print-friendly layout with dark text on white for paper or PDF.',
    },
  },
  {
    run: runBibleTranslationFeatureTour,
    intro: {
      title: 'Bible translation',
      description:
        'Use the Bible Translation control in the menu (under Print Version), then pick a version from the list—the same button-and-list pattern as Text size.',
    },
  },
  {
    run: runScriptureModalFeatureTour,
    intro: {
      title: 'Scripture reader',
      description:
        'Full-screen reader: compare translations, chapter view, stepping next/previous, optional colored pins saved when you close (local only), and clearing pins from the menu.',
    },
  },
  {
    run: runWordStudyFeatureTour,
    intro: {
      title: 'Greek and Hebrew word study',
      description:
        'Original-language tokens and Strong’s lexicon in the scripture reader: Greek, Hebrew, or Aramaic toolbar button, word chips, and the definition sheet.',
    },
  },
  {
    run: runMemorizeFeatureTour,
    intro: {
      title: 'Verse memorization',
      description:
        'Open a scripture card, save with Memorize in the reader, open the Memorize list, start practice from the verse row (intro + round 1), then remove the verse we add for this tour.',
    },
  },
  {
    run: runAddCustomMemorizationFeatureTour,
    intro: {
      title: 'Add custom memorization',
      description:
        'Open Menu → Memorize → + Add to pick any book, chapter, and verse (Genesis 1:1 for this tour), then the Add button—no verse is actually saved.',
    },
  },
  {
    run: runScriptureHoverPreviewFeatureTour,
    intro: {
      title: 'Quick verse preview',
      description:
        'Desktop: hover; phone or app: press-and-hold—popover demo of a quick verse card on paragraph links and blue section buttons.',
    },
  },
  {
    run: runMarriageSeminarResourcesTour,
    intro: {
      title: 'Marriage seminar resources',
      description:
        'Opens the shared marriage lesson from Resources (this segment navigates to another profile), then covers the video link, scripture cards, and homework questions.',
    },
  },
]

function getFullWalkthroughHeaderToolbarAfterThemeSegments(): FullProfileWalkthroughSegment[] {
  const mid: FullProfileWalkthroughSegment[] = [
    {
      run: runShareResourceFeatureTour,
      intro: {
        title: 'Share this resource',
        description:
          'Copy a link to this presentation or use your device’s share sheet when available.',
      },
    },
    {
      run: runBookmarksFeatureTour,
      intro: {
        title: 'Using bookmarks',
        description:
          'What bookmarks are, how scroll position matters, then add a practice bookmark, see it in the list, and remove it.',
      },
    },
    {
      run: runHighlightsFeatureTour,
      intro: {
        title: 'Highlights',
        description:
          'Save quotes from section content and return to them from the highlights list; search and remove entries as needed.',
      },
    },
  ]
  if (isProfileResourceListenControlAvailable()) {
    mid.push({
      run: runProfileListenFeatureTour,
      intro: {
        title: 'Listen (read aloud)',
        description:
          'Use the header speaker control to hear this presentation read aloud: pick a section, play or pause, adjust speed, optional read-along underline, and Word vs Line highlight width.',
      },
    })
  }
  return mid
}

export function getFullWalkthroughSegments(): FullProfileWalkthroughSegment[] {
  return [
    {
      run: runThemeFeatureTour,
      intro: {
        title: 'Light and dark mode',
        description:
          'Switch between light and dark appearance; this segment briefly flips the theme once, then restores your previous setting.',
      },
    },
    ...getFullWalkthroughHeaderToolbarAfterThemeSegments(),
    ...FULL_WALKTHROUGH_SEGMENTS_FROM_RESOURCES,
  ]
}

export function getFullWalkthroughIndexAfterScriptureReader(): number {
  const segments = getFullWalkthroughSegments()
  const i = segments.findIndex((s) => s.run === runScriptureModalFeatureTour)
  return i >= 0 ? i + 1 : segments.length
}

export function getFullWalkthroughIndexAfterWordStudy(): number {
  const segments = getFullWalkthroughSegments()
  const i = segments.findIndex((s) => s.run === runWordStudyFeatureTour)
  return i >= 0 ? i + 1 : segments.length
}

export function getFullWalkthroughIndexAfterMemorize(): number {
  const segments = getFullWalkthroughSegments()
  const i = segments.findIndex((s) => s.run === runMemorizeFeatureTour)
  return i >= 0 ? i + 1 : segments.length
}
