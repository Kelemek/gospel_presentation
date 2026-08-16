import type { DriveStep } from 'driver.js'
import type { ProfileFeatureTourOptions } from './tourShared'
import {
  MARRIAGE_SEMINAR_PROFILE_SLUG,
  MARRIAGE_SEMINAR_TOUR_RESUME_STORAGE_KEY,
  PROFILE_MENU_BUTTON,
  PROFILE_SECTION_EXTERNAL_LINK,
  RESOURCES_LIST_PANEL,
  TOC_RESOURCES_TOGGLE,
  baseProfileHelpDriverConfig,
  buildMarriageSeminarResourceLinkSelector,
  clearFullWalkthroughStartSlug,
  createProfileHelpDriver,
  escapeAttrSelectorValue,
  escapeForPopoverText,
  expandResourceCategoryIfCollapsed,
  fetchPublicResourceItemsForTour,
  findCategoryIdForTemplateSlug,
  isMarriageSeminarProfilePath,
  openProfileMenuIfClosed,
  parseMarriageSeminarTourResumeStorageValue,
  prefersReducedMotion,
  prependSegmentIntroIfAny,
  queryHomeworkFirstQuestionBlock,
  queryHomeworkFirstSaveAnswerButton,
  queryHomeworkSectionElement,
  queryHomeworkSectionHeading,
  queryMarriageSeminarScriptureCardForTour,
  resourcesListPanelReady,
  serializeMarriageSeminarTourResumeForNavigation,
  templateSlugInTopLevelBlocks,
} from './tourShared'
import { runFullWalkthroughThankYouFinale } from './fullWalkthroughFinale'

export function tryStartMarriageSeminarTourAfterNavigation(currentSlug: string): void {
  if (typeof window === 'undefined') return
  if (currentSlug !== MARRIAGE_SEMINAR_PROFILE_SLUG) return
  const raw = sessionStorage.getItem(MARRIAGE_SEMINAR_TOUR_RESUME_STORAGE_KEY)
  const payload = parseMarriageSeminarTourResumeStorageValue(raw)
  if (!payload) return
  sessionStorage.removeItem(MARRIAGE_SEMINAR_TOUR_RESUME_STORAGE_KEY)
  window.requestAnimationFrame(() => {
    const fullWalkthroughHooks: Pick<ProfileFeatureTourOptions, 'onComplete' | 'onAborted'> | undefined =
      payload.fullWalkthroughChain
        ? {
            onComplete: () => {
              runFullWalkthroughThankYouFinale()
            },
            onAborted: () => {
              clearFullWalkthroughStartSlug()
            },
          }
        : undefined
    runMarriageSeminarResourcesTourPostNavigationOnly({
      captive: payload.captive,
      ...fullWalkthroughHooks,
    })
  })
}

function runMarriageSeminarResourcesTourPostNavigationOnly(options?: ProfileFeatureTourOptions): void {
  const steps: DriveStep[] = [
    {
      element: () =>
        document.querySelector(PROFILE_SECTION_EXTERNAL_LINK) ??
        document.querySelector('main.container') ??
        document.body,
      popover: {
        title: 'Teaching video',
        description:
          'Many seminar-style presentations include a link like this. Tap it in your own time to <strong>watch the recording</strong> for this lesson (it opens in a new tab).',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: () =>
        queryMarriageSeminarScriptureCardForTour() ??
        document.querySelector('main.container') ??
        document.body,
      popover: {
        title: 'Scripture in this lesson',
        description:
          'On this lesson the <strong>first</strong> blue card often matches the video link above; the <strong>next</strong> cards are scripture. They work like everywhere else on the site: tap to open the reader, compare translations, use the <strong>Chapter</strong>/<strong>Verse</strong> toggle for full-chapter context when helpful, and move to the next or previous passage in order.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: () =>
        queryHomeworkSectionHeading() ??
        document.querySelector('main.container') ??
        document.body,
      onHighlighted: (_el, _step, { driver: drv }) => {
        const h = queryHomeworkSectionHeading()
        const section = h?.closest('section[id]')
        if (section?.id) {
          scrollToTocAnchor(section.id, {
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          })
        } else {
          h?.scrollIntoView({
            block: 'start',
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          })
        }
        window.requestAnimationFrame(() => {
          window.setTimeout(() => drv.refresh(), prefersReducedMotion() ? 80 : 400)
        })
      },
      popover: {
        title: 'Homework',
        description:
          'This section holds <strong>reflection questions</strong> for the lesson. The next steps show where to write your answer and how to save it (sign in when the site offers it so answers can sync to your account).',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: () =>
        queryHomeworkFirstQuestionBlock() ??
        queryHomeworkSectionElement() ??
        document.querySelector('main.container') ??
        document.body,
      onHighlighted: (_el, _step, { driver: drv }) => {
        const block = queryHomeworkFirstQuestionBlock()
        block?.scrollIntoView({
          block: 'center',
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        })
        window.requestAnimationFrame(() => {
          window.setTimeout(() => drv.refresh(), prefersReducedMotion() ? 80 : 400)
        })
      },
      popover: {
        title: 'Your answer',
        description:
          'Each card lists a question and a text box. <strong>Type</strong> your response here; a character count helps you stay within the limit. Use <strong>Next</strong> to see how saving works.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: () =>
        queryHomeworkFirstSaveAnswerButton() ??
        queryHomeworkFirstQuestionBlock() ??
        queryHomeworkSectionElement() ??
        document.querySelector('main.container') ??
        document.body,
      onHighlighted: (_el, _step, { driver: drv }) => {
        const btn = queryHomeworkFirstSaveAnswerButton()
        btn?.scrollIntoView({
          block: 'center',
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        })
        window.requestAnimationFrame(() => {
          window.setTimeout(() => drv.refresh(), prefersReducedMotion() ? 80 : 400)
        })
      },
      popover: {
        title: 'Save Answer',
        description:
          'Tap <strong>Save Answer</strong> to store what you wrote on this device right away.',
        side: 'top',
        align: 'start',
      },
    },
  ]

  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    showProgress: true,
    steps: prependSegmentIntroIfAny(options, steps),
  })
  d.drive()
}

/**
 * Marriage seminar: Menu → Resources → (Marriage folder when used) → open **Marriage: A Biblical Perspective**,
 * then (after navigation) recording link, first scripture card, and Homework.
 */
export function runMarriageSeminarResourcesTour(options?: ProfileFeatureTourOptions): void {
  void runMarriageSeminarResourcesTourAsync(options)
}

async function runMarriageSeminarResourcesTourAsync(options?: ProfileFeatureTourOptions): Promise<void> {
  if (typeof window === 'undefined') return

  if (isMarriageSeminarProfilePath(window.location.pathname)) {
    runMarriageSeminarResourcesTourPostNavigationOnly(options)
    return
  }

  const items = await fetchPublicResourceItemsForTour()
  const linkSel = buildMarriageSeminarResourceLinkSelector()
  const categoryId = findCategoryIdForTemplateSlug(items, MARRIAGE_SEMINAR_PROFILE_SLUG)
  const inTopLevel = templateSlugInTopLevelBlocks(items, MARRIAGE_SEMINAR_PROFILE_SLUG)
  const hasListedTemplate =
    inTopLevel ||
    items.some(
      (i) =>
        i.type === 'category' &&
        i.children.some((c) => c.type === 'template' && c.slug === MARRIAGE_SEMINAR_PROFILE_SLUG)
    )

  let navigationScheduled = false

  const steps: DriveStep[] = [
    {
      element: PROFILE_MENU_BUTTON,
      popover: {
        title: 'Menu',
        description:
          'Use the <strong>menu icon</strong> to reach shared seminar profiles under <strong>Resources</strong>. Use <strong>Next</strong> to open it for this tour.',
        side: 'bottom',
        align: 'start',
        onNextClick: (_e, _s, { driver: drv }) => {
          openProfileMenuIfClosed()
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, 380)
        },
      },
    },
    {
      element: TOC_RESOURCES_TOGGLE,
      popover: {
        title: 'Resources',
        description:
          'Open <strong>Resources</strong> to see presentations your church published—including marriage seminar lessons when they are enabled. Use <strong>Next</strong> to expand the list.',
        side: 'right',
        align: 'start',
        onNextClick: (_e, _s, { driver: drv }) => {
          const t = document.querySelector<HTMLElement>(TOC_RESOURCES_TOGGLE)
          if (!t) {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 200)
            return
          }
          if (!document.querySelector(RESOURCES_LIST_PANEL)) {
            t.click()
          }
          void waitUntil(() => {
            const listPanel = document.querySelector(RESOURCES_LIST_PANEL)
            return !!(listPanel && resourcesListPanelReady(listPanel))
          }, 10000).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 120)
          })
        },
      },
    },
  ]

  if (categoryId && !inTopLevel) {
    const cat = items.find((i) => i.type === 'category' && i.id === categoryId) as
      | Extract<PublicResourceItem, { type: 'category' }>
      | undefined
    const safeName = escapeForPopoverText(cat?.name.trim() || 'Marriage')
    steps.push({
      element: () =>
        document.querySelector(`[data-resource-category-id="${escapeAttrSelectorValue(categoryId)}"]`) ??
        document.querySelector(RESOURCES_LIST_PANEL)!,
      popover: {
        title: safeName,
        description:
          '<p>Marriage seminar profiles are often grouped here. The next step highlights <strong>Marriage: A Biblical Perspective</strong>—use <strong>Next</strong> to open that presentation (the folder expands if it was closed).</p>',
        side: 'right',
        align: 'start',
      },
      onHighlightStarted: (_el, _step, { driver: drv }) =>
        expandResourceCategoryIfCollapsed(categoryId, drv),
    })
  }

  steps.push({
    element: () => document.querySelector(linkSel) ?? document.querySelector(RESOURCES_LIST_PANEL)!,
    onHighlightStarted: (_el, _step, { driver: drv }) => {
      if (categoryId) {
        expandResourceCategoryIfCollapsed(categoryId, drv)
      }
      const link = document.querySelector<HTMLElement>(linkSel)
      link?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    },
    popover: {
      title: 'Open this lesson',
      description: hasListedTemplate
        ? '<p>Tap <strong>Marriage: A Biblical Perspective</strong> to load that presentation—or use <strong>Next</strong> and this tour will open it for you. The following steps explain the recording link, scripture cards, and homework on that page.</p>'
        : '<p>This church’s resource list does not currently include that profile, so the link may be missing here. When it appears under Resources, tapping it opens the lesson. You can also ask your administrator if you expected to see it.</p>',
      side: 'right',
      align: 'start',
      onNextClick: (_e, _s, { driver: drv }) => {
        const link = document.querySelector<HTMLElement>(linkSel)
        if (!link || !hasListedTemplate) {
          window.setTimeout(() => drv.destroy(), 80)
          return
        }
        navigationScheduled = true
        try {
          sessionStorage.setItem(
            MARRIAGE_SEMINAR_TOUR_RESUME_STORAGE_KEY,
            serializeMarriageSeminarTourResumeForNavigation(options)
          )
        } catch {
          navigationScheduled = false
          window.setTimeout(() => drv.destroy(), 80)
          return
        }
        link.click()
        window.setTimeout(() => {
          drv.destroy()
        }, 200)
      },
    },
  })

  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig({
      ...options,
      onAborted: () => {
        if (!navigationScheduled) {
          try {
            sessionStorage.removeItem(MARRIAGE_SEMINAR_TOUR_RESUME_STORAGE_KEY)
          } catch {
            /* ignore */
          }
        }
        options?.onAborted?.()
      },
      onComplete: () => {
        if (!navigationScheduled) {
          try {
            sessionStorage.removeItem(MARRIAGE_SEMINAR_TOUR_RESUME_STORAGE_KEY)
          } catch {
            /* ignore */
          }
          options?.onComplete?.()
        }
        /* When navigating to the marriage profile, chain `onComplete` runs after post-navigation steps
         * (`tryStartMarriageSeminarTourAfterNavigation` reattaches it). */
      },
    }),
    showProgress: true,
    steps: prependSegmentIntroIfAny(options, steps),
  })

  d.drive()
}

/**
 * Final full-walkthrough step: thank-you message, then browser navigation back to the profile slug stored at walkthrough start.
 * Exported for tests (`scriptureReaderTourNavigation.assign`).
 */

