import type { PublicResourceItem } from '@/lib/supabase-data-service'
import { morneveLibraryMenuTitle } from '@/lib/spurgeon/morneveSlug'

export const BIBLE_READER_DEFAULT_MENU_TITLE = 'Bible Reader'

/** Title when Bible Reader is enabled in admin resource order (top-level or inside a category). */
export function resolveBibleReaderMenuTitle(items: PublicResourceItem[]): string | null {
  for (const item of items) {
    if (item.type === 'bibleReader') {
      return item.title.trim() || BIBLE_READER_DEFAULT_MENU_TITLE
    }
  }
  for (const item of items) {
    if (item.type === 'category') {
      for (const child of item.children) {
        if (child.type === 'bibleReader') {
          return child.title.trim() || BIBLE_READER_DEFAULT_MENU_TITLE
        }
      }
    }
  }
  return null
}

/** Resource list for the Resources dropdown (Bible Reader is a separate main-menu control). */
export function publicResourceItemsForResourcesMenu(
  items: PublicResourceItem[]
): PublicResourceItem[] {
  const out: PublicResourceItem[] = []
  for (const item of items) {
    if (item.type === 'bibleReader') continue
    if (item.type === 'category') {
      const children = item.children.filter((child) => child.type !== 'bibleReader')
      if (children.length === 0) continue
      out.push({ ...item, children })
      continue
    }
    out.push(item)
  }
  return out
}

export type ResourceRenderGroup =
  | { kind: 'templates'; items: Extract<PublicResourceItem, { type: 'template' }>[] }
  | { kind: 'category'; item: Extract<PublicResourceItem, { type: 'category' }> }
  | { kind: 'spurgeonLibrary'; title: string }
  | { kind: 'morningEveningLibrary'; title: string }
  | { kind: 'calvinLibrary'; title: string }
  | { kind: 'henryLibrary'; title: string }
  | { kind: 'edwardsLibrary'; title: string }

function flushTemplates(
  run: Extract<PublicResourceItem, { type: 'template' }>[],
  groups: ResourceRenderGroup[]
) {
  if (run.length > 0) {
    groups.push({ kind: 'templates', items: run })
  }
}

/**
 * Groups consecutive top-level template rows so UI (and tours) can treat them as one block.
 * Category rows and the Spurgeon library row stay individual.
 */
export function groupPublicResourceItems(items: PublicResourceItem[]): ResourceRenderGroup[] {
  const groups: ResourceRenderGroup[] = []
  let run: Extract<PublicResourceItem, { type: 'template' }>[] = []

  for (const item of items) {
    if (item.type === 'template') {
      run.push(item)
    } else {
      flushTemplates(run, groups)
      run = []
      if (item.type === 'category') {
        groups.push({ kind: 'category', item })
      } else if (item.type === 'morningEveningLibrary') {
        groups.push({ kind: 'morningEveningLibrary', title: morneveLibraryMenuTitle(item.title) })
      } else if (item.type === 'calvinLibrary') {
        groups.push({ kind: 'calvinLibrary', title: item.title })
      } else if (item.type === 'henryLibrary') {
        groups.push({ kind: 'henryLibrary', title: item.title })
      } else if (item.type === 'edwardsLibrary') {
        groups.push({ kind: 'edwardsLibrary', title: item.title })
      } else if (item.type === 'spurgeonLibrary') {
        groups.push({ kind: 'spurgeonLibrary', title: item.title })
      }
    }
  }
  flushTemplates(run, groups)
  return groups
}
