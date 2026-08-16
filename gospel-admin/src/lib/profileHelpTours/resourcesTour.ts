import type { Alignment, DriveStep, Side } from 'driver.js'
import {
  groupPublicResourceItems,
  publicResourceItemsForResourcesMenu,
  resolveBibleReaderMenuTitle,
} from '@/lib/groupPublicResourceItems'
import type { ProfileFeatureTourOptions } from './tourShared'
import {
  MAX_RESOURCE_CATEGORY_STEPS,
  MAX_RESOURCE_TEMPLATE_BLOCKS,
  PROFILE_MENU_BUTTON,
  RESOURCES_LIST_PANEL,
  TOC_BIBLE_READER,
  TOC_RESOURCES_TOGGLE,
  baseProfileHelpDriverConfig,
  createProfileHelpDriver,
  escapeAttrSelectorValue,
  escapeForPopoverText,
  expandResourceCategoryIfCollapsed,
  fetchPublicResourceItemsForTour,
  openProfileMenuIfClosed,
  prependSegmentIntroIfAny,
  resourceCategoryBlockDescription,
  resourceTemplatesBlockDescription,
  resourceTemplatesBlockTitle,
  resourcesListOverviewCopy,
  resourcesListPanelReady,
  waitUntil,
} from './tourShared'

export function runResourcesFeatureTour(options?: ProfileFeatureTourOptions): void {
  void runResourcesFeatureTourAsync(options)
}

async function runResourcesFeatureTourAsync(options?: ProfileFeatureTourOptions): Promise<void> {
  const items = await fetchPublicResourceItemsForTour()
  const menuItems = publicResourceItemsForResourcesMenu(items)
  const groups = groupPublicResourceItems(menuItems)
  const bibleReaderTitle = resolveBibleReaderMenuTitle(items)

  const steps: DriveStep[] = [
    {
      element: PROFILE_MENU_BUTTON,
      popover: {
        title: 'Menu',
        description:
          'Tap the <strong>menu icon</strong> (top-left) whenever you need the table of contents—<strong>Resources</strong>, text size, Bible translation, print, and links to each section. Use <strong>Next</strong> to open it for this tour.',
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
          'Tap <strong>Resources</strong> to show or hide shared presentations. Use <strong>Next</strong> to expand the list for this tour.',
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
          // Do not use aria-expanded: driver.js sets aria-expanded="true" on the highlighted
          // element for the popover, which overwrites React's real Resources open state.
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
    ...(bibleReaderTitle
      ? [
          {
            element: TOC_BIBLE_READER,
            popover: {
              title: escapeForPopoverText(bibleReaderTitle),
              description:
                '<p>This button opens the <strong>Bible Reader</strong>: pick a book, chapter, and optional verses, then read in the scripture modal on the current profile.</p><p class="mt-2">In the reader toolbar, use the <strong>highlight</strong> marker to tint the passage (red, blue, yellow, green, or violet) and find it again under <strong>Highlights</strong> in the header.</p>',
              side: 'right' as Side,
              align: 'start' as Alignment,
            },
          } satisfies DriveStep,
        ]
      : []),
    {
      element: RESOURCES_LIST_PANEL,
      popover: {
        title: 'What you will see',
        description: resourcesListOverviewCopy(items),
        side: 'right',
        align: 'start',
      },
    },
  ]

  let templateBlocksVisited = 0
  let categoriesVisited = 0
  let spurgeonLibraryVisited = 0

  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]
    if (g.kind === 'templates') {
      if (templateBlocksVisited >= MAX_RESOURCE_TEMPLATE_BLOCKS) continue
      templateBlocksVisited++
      const blockIndex = String(gi)
      steps.push({
        element: () =>
          document.querySelector(
            `${RESOURCES_LIST_PANEL} [data-resource-templates-block="${escapeAttrSelectorValue(blockIndex)}"]`
          ) ?? document.querySelector(RESOURCES_LIST_PANEL)!,
        popover: {
          title: resourceTemplatesBlockTitle(g.items.length),
          description: resourceTemplatesBlockDescription(g.items),
          side: 'right',
          align: 'start',
        },
      })
      continue
    }

    if (g.kind === 'spurgeonLibrary') {
      if (spurgeonLibraryVisited >= 1) continue
      spurgeonLibraryVisited++
      const safeTitle = escapeForPopoverText(g.title.trim() || 'Spurgeon sermons')
      steps.push({
        element: () =>
          document.querySelector(
            `${RESOURCES_LIST_PANEL} [data-resource-spurgeon-library]`
          ) ?? document.querySelector(RESOURCES_LIST_PANEL)!,
        popover: {
          title: safeTitle,
          description:
            '<p>This row opens the <strong>Spurgeon sermon library</strong>: search by keyword or by Bible reference, then open a sermon as a read-only presentation.</p><p class="mt-2">Tap it when you want to browse Charles Spurgeon’s sermons that your church has published.</p>',
          side: 'right',
          align: 'start',
        },
      })
      continue
    }

    if (g.kind === 'morningEveningLibrary') {
      const safeTitle = escapeForPopoverText(g.title.trim() || "Spurgeon's Morning & Evening")
      steps.push({
        element: () =>
          document.querySelector(
            `${RESOURCES_LIST_PANEL} [data-resource-morneve-library]`
          ) ?? document.querySelector(RESOURCES_LIST_PANEL)!,
        popover: {
          title: safeTitle,
          description:
            '<p>This row opens <strong>Morning and Evening</strong>: jump to today’s devotional or pick any day on the calendar.</p><p class="mt-2">Tap it when you want Spurgeon’s daily readings for a specific date.</p>',
          side: 'right',
          align: 'start',
        },
      })
      continue
    }

    if (g.kind === 'calvinLibrary') {
      const safeTitle = escapeForPopoverText(g.title.trim() || "Calvin's Commentaries")
      steps.push({
        element: () =>
          document.querySelector(
            `${RESOURCES_LIST_PANEL} [data-resource-calvin-library]`
          ) ?? document.querySelector(RESOURCES_LIST_PANEL)!,
        popover: {
          title: safeTitle,
          description:
            '<p>This row opens <strong>Calvin’s commentaries</strong>: search by book title or by Bible reference, then open a commentary volume as a read-only presentation.</p><p class="mt-2">Tap it when you want John Calvin’s exposition on a passage or book.</p>',
          side: 'right',
          align: 'start',
        },
      })
      continue
    }

    if (g.kind === 'henryLibrary') {
      const safeTitle = escapeForPopoverText(g.title.trim() || "Matthew Henry's Commentary")
      steps.push({
        element: () =>
          document.querySelector(
            `${RESOURCES_LIST_PANEL} [data-resource-henry-library]`
          ) ?? document.querySelector(RESOURCES_LIST_PANEL)!,
        popover: {
          title: safeTitle,
          description:
            '<p>This row opens <strong>Matthew Henry’s commentary</strong>: search by book title or by Bible reference, then open a commentary volume as a read-only presentation.</p><p class="mt-2">Tap it when you want Henry’s exposition on a passage or book.</p>',
          side: 'right',
          align: 'start',
        },
      })
      continue
    }

    if (g.kind === 'edwardsLibrary') {
      const safeTitle = escapeForPopoverText(g.title.trim() || 'Jonathan Edwards sermons')
      steps.push({
        element: () =>
          document.querySelector(
            `${RESOURCES_LIST_PANEL} [data-resource-edwards-library]`
          ) ?? document.querySelector(RESOURCES_LIST_PANEL)!,
        popover: {
          title: safeTitle,
          description:
            '<p>This row opens the <strong>Edwards sermon library</strong>: search by keyword or by Bible reference, then open a Select Sermons volume as a read-only presentation.</p><p class="mt-2">Tap it when you want to browse Jonathan Edwards’s published sermons.</p>',
          side: 'right',
          align: 'start',
        },
      })
      continue
    }

    if (g.kind !== 'category') continue
    if (categoriesVisited >= MAX_RESOURCE_CATEGORY_STEPS) continue
    categoriesVisited++

    const cat = g.item
    const safeCatName = escapeForPopoverText(cat.name.trim() || 'Category')

    steps.push({
      element: () =>
        document.querySelector(`[data-resource-category-id="${escapeAttrSelectorValue(cat.id)}"]`) ??
        document.querySelector(RESOURCES_LIST_PANEL)!,
      popover: {
        title: safeCatName,
        description: resourceCategoryBlockDescription(cat),
        side: 'right',
        align: 'start',
      },
      onHighlightStarted:
        cat.children.length > 0
          ? (_el, _step, { driver: drv }) => expandResourceCategoryIfCollapsed(cat.id, drv)
          : undefined,
    })
  }

  const stepsWithIntro = prependSegmentIntroIfAny(options, steps)
  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    showProgress: stepsWithIntro.length > 1,
    steps: stepsWithIntro,
  })

  d.drive()
}


