import type {
  ResourceOrderCategoryChild,
  ResourceOrderItem,
  ResourceOrderItemCalvinLibrary,
  ResourceOrderItemHenryLibrary,
  ResourceOrderItemCategory,
  ResourceOrderItemEdwardsLibrary,
  ResourceOrderItemMorningEveningLibrary,
  ResourceOrderItemSpurgeonLibrary,
  ResourceOrderItemTemplate,
} from '@/lib/types'
import {
  isResourceOrderItemCalvinLibrary,
  isResourceOrderItemHenryLibrary,
  isResourceOrderItemEdwardsLibrary,
  isResourceOrderItemMorningEveningLibrary,
  isResourceOrderItemSpurgeonLibrary,
} from '@/lib/types'
import { isDeprecatedLutherGalatiansSlug, LUTHER_GALATIANS_SLUG } from '@/lib/luther/lutherSlug'

function normalizeOrderTemplateSlug(slug: string): string {
  const s = slug.trim()
  if (isDeprecatedLutherGalatiansSlug(s)) return LUTHER_GALATIANS_SLUG
  return s
}

export type {
  ResourceOrderCategoryChild,
  ResourceOrderItemCalvinLibrary,
  ResourceOrderItemEdwardsLibrary,
  ResourceOrderItemMorningEveningLibrary,
  ResourceOrderItemSpurgeonLibrary,
  ResourceOrderItemTemplate,
}

export function isResourceOrderLibraryItem(
  item: ResourceOrderItem | ResourceOrderCategoryChild
): item is
  | ResourceOrderItemSpurgeonLibrary
  | ResourceOrderItemMorningEveningLibrary
  | ResourceOrderItemCalvinLibrary
  | ResourceOrderItemHenryLibrary
  | ResourceOrderItemEdwardsLibrary {
  return (
    isResourceOrderItemSpurgeonLibrary(item) ||
    isResourceOrderItemMorningEveningLibrary(item) ||
    isResourceOrderItemCalvinLibrary(item) ||
    isResourceOrderItemHenryLibrary(item) ||
    isResourceOrderItemEdwardsLibrary(item)
  )
}

export function parseCategoryChild(el: unknown): ResourceOrderCategoryChild | null {
  if (!el || typeof el !== 'object' || !('type' in el)) return null
  const o = el as Record<string, unknown>
  if (o.type === 'template' && typeof o.slug === 'string') {
    return { type: 'template', slug: normalizeOrderTemplateSlug(o.slug) }
  }
  if (o.type === 'spurgeonLibrary') {
    const rawTitle = o.title
    const title =
      typeof rawTitle === 'string' && rawTitle.trim() ? rawTitle.trim() : 'Spurgeon sermons'
    return { type: 'spurgeonLibrary', title }
  }
  if (o.type === 'morningEveningLibrary') {
    const rawTitle = o.title
    const title =
      typeof rawTitle === 'string' && rawTitle.trim()
        ? rawTitle.trim()
        : "Spurgeon's Morning and Evening"
    return { type: 'morningEveningLibrary', title }
  }
  if (o.type === 'calvinLibrary') {
    const rawTitle = o.title
    const title =
      typeof rawTitle === 'string' && rawTitle.trim()
        ? rawTitle.trim()
        : "Calvin's Commentaries"
    return { type: 'calvinLibrary', title }
  }
  if (o.type === 'henryLibrary') {
    const rawTitle = o.title
    const title =
      typeof rawTitle === 'string' && rawTitle.trim()
        ? rawTitle.trim()
        : "Matthew Henry's Commentary"
    return { type: 'henryLibrary', title }
  }
  if (o.type === 'edwardsLibrary') {
    const rawTitle = o.title
    const title =
      typeof rawTitle === 'string' && rawTitle.trim()
        ? rawTitle.trim()
        : 'Jonathan Edwards sermons'
    return { type: 'edwardsLibrary', title }
  }
  return null
}

/** Parse category children from stored JSON (`children` or legacy `templateSlugs`). */
export function parseCategoryChildrenFromRaw(el: Record<string, unknown>): ResourceOrderCategoryChild[] {
  if (Array.isArray(el.children)) {
    const out: ResourceOrderCategoryChild[] = []
    for (const child of el.children) {
      const parsed = parseCategoryChild(child)
      if (parsed) out.push(parsed)
    }
    return out
  }
  if (Array.isArray(el.templateSlugs)) {
    return el.templateSlugs
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      .map((slug) => ({ type: 'template', slug: normalizeOrderTemplateSlug(slug) }))
  }
  return []
}

export function emptyCategory(id: string, name: string): ResourceOrderItemCategory {
  return { type: 'category', id, name, children: [] }
}

export function orderContainsSpurgeonLibrary(items: ResourceOrderItem[]): boolean {
  return items.some((item) => {
    if (isResourceOrderItemSpurgeonLibrary(item)) return true
    if (item.type === 'category') {
      return item.children.some((c) => c.type === 'spurgeonLibrary')
    }
    return false
  })
}

export function orderContainsMorningEveningLibrary(items: ResourceOrderItem[]): boolean {
  return items.some((item) => {
    if (isResourceOrderItemMorningEveningLibrary(item)) return true
    if (item.type === 'category') {
      return item.children.some((c) => c.type === 'morningEveningLibrary')
    }
    return false
  })
}

export function orderContainsCalvinLibrary(items: ResourceOrderItem[]): boolean {
  return items.some((item) => {
    if (isResourceOrderItemCalvinLibrary(item)) return true
    if (item.type === 'category') {
      return item.children.some((c) => c.type === 'calvinLibrary')
    }
    return false
  })
}

export function orderContainsEdwardsLibrary(items: ResourceOrderItem[]): boolean {
  return items.some((item) => {
    if (isResourceOrderItemEdwardsLibrary(item)) return true
    if (item.type === 'category') {
      return item.children.some((c) => c.type === 'edwardsLibrary')
    }
    return false
  })
}

export function orderContainsHenryLibrary(items: ResourceOrderItem[]): boolean {
  return items.some((item) => {
    if (isResourceOrderItemHenryLibrary(item)) return true
    if (item.type === 'category') {
      return item.children.some((c) => c.type === 'henryLibrary')
    }
    return false
  })
}

export function categoryChildReactKey(categoryId: string, child: ResourceOrderCategoryChild, index: number): string {
  if (child.type === 'template') return `${categoryId}-t-${child.slug}`
  return `${categoryId}-${child.type}-${index}`
}

/** Promote category children to top-level order items when deleting a category. */
export function categoryChildrenAsTopLevelItems(
  children: ResourceOrderCategoryChild[]
): ResourceOrderItem[] {
  return children.map((c) => ({ ...c }))
}

/** Parse public_template_order JSON from DB into ResourceOrderItem[] (new format only). */
export type ResourceOrderDragSource =
  | { kind: 'top-level'; index: number }
  | {
      kind: 'template'
      slug: string
      topLevelIndex?: number
      categoryId?: string
      indexInCategory?: number
    }
  | { kind: 'categoryChild'; categoryId: string; childIndex: number }

export type ResourceOrderDropTarget =
  | { kind: 'top-level'; index: number }
  | { kind: 'category'; categoryId: string; indexInCategory?: number }

function insertCategoryChild(
  cat: ResourceOrderItemCategory,
  child: ResourceOrderCategoryChild,
  indexInCategory?: number
): ResourceOrderItemCategory {
  const children = [...cat.children]
  const insertAt =
    indexInCategory != null && indexInCategory >= 0
      ? Math.min(indexInCategory, children.length)
      : children.length
  children.splice(insertAt, 0, child)
  return { ...cat, children }
}

function removeTemplateSlugFromCategory(
  cat: ResourceOrderItemCategory,
  slug: string
): ResourceOrderItemCategory {
  return {
    ...cat,
    children: cat.children.filter((c) => !(c.type === 'template' && c.slug === slug)),
  }
}

/** Pure reorder/move for admin Resources drag-and-drop. */
export function applyResourceOrderDrop(
  items: ResourceOrderItem[],
  source: ResourceOrderDragSource,
  target: ResourceOrderDropTarget
): ResourceOrderItem[] {
  if (source.kind === 'top-level' && target.kind === 'top-level') {
    if (source.index === target.index) return items
    const next = [...items]
    const [removed] = next.splice(source.index, 1)
    next.splice(target.index, 0, removed)
    return next
  }

  if (source.kind === 'top-level' && target.kind === 'category') {
    const item = items[source.index]
    if (!item || !isResourceOrderLibraryItem(item)) return items
    const child = { ...item }
    let next = items.filter((_, i) => i !== source.index)
    const catIdx = next.findIndex((i) => i.type === 'category' && i.id === target.categoryId)
    if (catIdx === -1) return items
    const cat = next[catIdx]
    if (cat.type !== 'category') return items
    next = [...next]
    next[catIdx] = insertCategoryChild(cat, child, target.indexInCategory)
    return next
  }

  if (source.kind === 'categoryChild' && target.kind === 'top-level') {
    const catIdx = items.findIndex((i) => i.type === 'category' && i.id === source.categoryId)
    if (catIdx === -1) return items
    const cat = items[catIdx]
    if (cat.type !== 'category') return items
    const child = cat.children[source.childIndex]
    if (!child) return items
    const next = [...items]
    const newChildren = cat.children.filter((_, i) => i !== source.childIndex)
    next[catIdx] = { ...cat, children: newChildren }
    const insertAt = Math.min(target.index, next.length)
    next.splice(insertAt, 0, { ...child })
    return next
  }

  if (source.kind === 'categoryChild' && target.kind === 'category') {
    const fromCatIdx = items.findIndex((i) => i.type === 'category' && i.id === source.categoryId)
    if (fromCatIdx === -1) return items
    const fromCat = items[fromCatIdx]
    if (fromCat.type !== 'category') return items
    const child = fromCat.children[source.childIndex]
    if (!child) return items

    const next = [...items]
    const fromChildren = fromCat.children.filter((_, i) => i !== source.childIndex)
    next[fromCatIdx] = { ...fromCat, children: fromChildren }

    const toCatIdx = next.findIndex((i) => i.type === 'category' && i.id === target.categoryId)
    if (toCatIdx === -1) return items
    const toCat = next[toCatIdx]
    if (toCat.type !== 'category') return items

    let insertAt =
      target.indexInCategory != null && target.indexInCategory >= 0
        ? target.indexInCategory
        : toCat.children.length
    if (source.categoryId === target.categoryId && target.indexInCategory != null) {
      if (source.childIndex < insertAt) insertAt--
    }
    insertAt = Math.min(Math.max(0, insertAt), toCat.children.length)

    const toChildren = [...toCat.children]
    toChildren.splice(insertAt, 0, child)
    next[toCatIdx] = { ...toCat, children: toChildren }
    return next
  }

  if (source.kind === 'template') {
    const slug = source.slug
    const removeFromOrder = (prev: ResourceOrderItem[]): ResourceOrderItem[] => {
      if (source.topLevelIndex != null) {
        return prev.filter((_, i) => i !== source.topLevelIndex)
      }
      if (source.categoryId != null) {
        return prev.map((item) =>
          item.type === 'category' && item.id === source.categoryId
            ? removeTemplateSlugFromCategory(item, slug)
            : item
        )
      }
      return prev
    }

    if (target.kind === 'top-level') {
      const afterRemove = removeFromOrder(items)
      const insertIndex = Math.min(target.index, afterRemove.length)
      return [
        ...afterRemove.slice(0, insertIndex),
        { type: 'template', slug },
        ...afterRemove.slice(insertIndex),
      ]
    }

    if (target.kind === 'category') {
      const afterRemove = removeFromOrder(items)
      const catIdx = afterRemove.findIndex((i) => i.type === 'category' && i.id === target.categoryId)
      if (catIdx === -1) return afterRemove
      const cat = afterRemove[catIdx]
      if (cat.type !== 'category') return afterRemove
      const isSameCategory = source.categoryId === target.categoryId
      const children = isSameCategory
        ? cat.children.filter((c) => !(c.type === 'template' && c.slug === slug))
        : [...cat.children]
      const insertAt =
        target.indexInCategory != null && target.indexInCategory >= 0
          ? Math.min(target.indexInCategory, children.length)
          : children.length
      children.splice(insertAt, 0, { type: 'template', slug })
      const next = [...afterRemove]
      next[catIdx] = { ...cat, children }
      return next
    }
  }

  return items
}

/** Template slugs referenced in saved Resources menu order (top-level and inside categories). */
export function templateSlugsInResourceOrder(order: ResourceOrderItem[]): string[] {
  const slugs: string[] = []
  for (const item of order) {
    if (item.type === 'template') slugs.push(item.slug)
    else if (item.type === 'category') {
      for (const child of item.children) {
        if (child.type === 'template') slugs.push(child.slug)
      }
    }
  }
  return slugs
}

export function parseResourceOrder(raw: unknown): ResourceOrderItem[] {
  if (!Array.isArray(raw)) return []
  const out: ResourceOrderItem[] = []
  for (const el of raw) {
    if (el && typeof el === 'object' && 'type' in el) {
      const o = el as Record<string, unknown>
      if (o.type === 'template' && typeof o.slug === 'string') {
        out.push({ type: 'template', slug: normalizeOrderTemplateSlug(o.slug) })
      } else if (o.type === 'category' && typeof o.id === 'string' && typeof o.name === 'string') {
        out.push({
          type: 'category',
          id: o.id,
          name: o.name,
          children: parseCategoryChildrenFromRaw(o),
        })
      } else if (o.type === 'spurgeonLibrary') {
        const rawTitle = o.title
        const title =
          typeof rawTitle === 'string' && rawTitle.trim() ? rawTitle.trim() : 'Spurgeon sermons'
        out.push({ type: 'spurgeonLibrary', title })
      } else if (o.type === 'morningEveningLibrary') {
        const rawTitle = o.title
        const title =
          typeof rawTitle === 'string' && rawTitle.trim()
            ? rawTitle.trim()
            : "Spurgeon's Morning and Evening"
        out.push({ type: 'morningEveningLibrary', title })
      } else if (o.type === 'calvinLibrary') {
        const rawTitle = o.title
        const title =
          typeof rawTitle === 'string' && rawTitle.trim()
            ? rawTitle.trim()
            : "Calvin's Commentaries"
        out.push({ type: 'calvinLibrary', title })
      } else if (o.type === 'henryLibrary') {
        const rawTitle = o.title
        const title =
          typeof rawTitle === 'string' && rawTitle.trim()
            ? rawTitle.trim()
            : "Matthew Henry's Commentary"
        out.push({ type: 'henryLibrary', title })
      } else if (o.type === 'edwardsLibrary') {
        const rawTitle = o.title
        const title =
          typeof rawTitle === 'string' && rawTitle.trim()
            ? rawTitle.trim()
            : 'Jonathan Edwards sermons'
        out.push({ type: 'edwardsLibrary', title })
      }
    }
  }
  return out
}
