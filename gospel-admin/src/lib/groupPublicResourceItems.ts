import type { PublicResourceItem } from '@/lib/supabase-data-service'

export type ResourceRenderGroup =
  | { kind: 'templates'; items: Extract<PublicResourceItem, { type: 'template' }>[] }
  | { kind: 'category'; item: Extract<PublicResourceItem, { type: 'category' }> }
  | { kind: 'spurgeonLibrary'; title: string }

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
      } else {
        groups.push({ kind: 'spurgeonLibrary', title: item.title })
      }
    }
  }
  flushTemplates(run, groups)
  return groups
}
