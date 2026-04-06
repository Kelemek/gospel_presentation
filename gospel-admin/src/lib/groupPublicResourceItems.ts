import type { PublicResourceItem } from '@/lib/supabase-data-service'

export type ResourceRenderGroup =
  | { kind: 'templates'; items: Extract<PublicResourceItem, { type: 'template' }>[] }
  | { kind: 'category'; item: Extract<PublicResourceItem, { type: 'category' }> }

/**
 * Groups consecutive top-level template rows so UI (and tours) can treat them as one block.
 * Category rows stay individual.
 */
export function groupPublicResourceItems(items: PublicResourceItem[]): ResourceRenderGroup[] {
  const groups: ResourceRenderGroup[] = []
  let run: Extract<PublicResourceItem, { type: 'template' }>[] = []

  for (const item of items) {
    if (item.type === 'template') {
      run.push(item)
    } else {
      if (run.length > 0) {
        groups.push({ kind: 'templates', items: run })
        run = []
      }
      groups.push({ kind: 'category', item })
    }
  }
  if (run.length > 0) {
    groups.push({ kind: 'templates', items: run })
  }
  return groups
}
