import {
  groupPublicResourceItems,
  publicResourceItemsForResourcesMenu,
} from '@/lib/groupPublicResourceItems'
import { edwardsSermonTitleForModalDisplay } from '@/lib/edwards/edwardsSlug'
import { kindleProfileReadUrl } from '@/lib/kindleReadHtml'
import {
  kindleReadLibraryIndexUrl,
  type KindleReadLibraryKind,
  type KindleReadLibraryPage,
} from '@/lib/kindleReadLibraryData'
import { spurgeonSermonTitleForModalDisplay } from '@/lib/spurgeon/sortBySpurgeonSermonSlug'
import type {
  PublicResourceCategoryChild,
  PublicResourceItem,
} from '@/lib/supabase-data-service'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function libraryKindFromResourceType(
  type: PublicResourceCategoryChild['type'] | PublicResourceItem['type']
): KindleReadLibraryKind | null {
  switch (type) {
    case 'spurgeonLibrary':
      return 'spurgeon'
    case 'morningEveningLibrary':
      return 'morneve'
    case 'calvinLibrary':
      return 'calvin'
    case 'henryLibrary':
      return 'henry'
    case 'edwardsLibrary':
      return 'edwards'
    default:
      return null
  }
}

function resourceLinkHtml(label: string, href: string): string {
  return `<li class="kindle-read-resources-item"><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`
}

function renderResourceChildHtml(child: PublicResourceCategoryChild, fromSlug: string): string {
  if (child.type === 'template') {
    return resourceLinkHtml(child.title, kindleProfileReadUrl(child.slug))
  }
  if (child.type === 'bibleReader') {
    return `<li class="kindle-read-resources-item kindle-read-resources-note">${escapeHtml(child.title)} (full site on phone or computer)</li>`
  }
  const kind = libraryKindFromResourceType(child.type)
  if (kind) {
    return resourceLinkHtml(child.title, kindleReadLibraryIndexUrl(kind, 1, fromSlug))
  }
  return ''
}

function renderTopLevelResourceHtml(item: PublicResourceItem, fromSlug: string): string {
  if (item.type === 'template') {
    return resourceLinkHtml(item.title, kindleProfileReadUrl(item.slug))
  }
  if (item.type === 'bibleReader') {
    return `<li class="kindle-read-resources-item kindle-read-resources-note">${escapeHtml(item.title)} (full site on phone or computer)</li>`
  }
  if (item.type === 'category') {
    const children = item.children
      .map((child) => renderResourceChildHtml(child, fromSlug))
      .filter(Boolean)
      .join('')
    if (!children) return ''
    return `<li class="kindle-read-resources-category-item">
      <details class="kindle-read-resources-category">
        <summary class="kindle-read-resources-category-name">${escapeHtml(item.name)}</summary>
        <div class="kindle-read-resources-category-body">
          <ul class="kindle-read-resources-list">${children}</ul>
        </div>
      </details>
    </li>`
  }
  const kind = libraryKindFromResourceType(item.type)
  if (kind) {
    return resourceLinkHtml(item.title, kindleReadLibraryIndexUrl(kind, 1, fromSlug))
  }
  return ''
}

/** Inner Resources list HTML (no outer <details>; for combined Menu). */
export function renderKindleReadResourcesMenuInnerHtml(
  items: PublicResourceItem[],
  fromSlug: string
): string {
  const menuItems = publicResourceItemsForResourcesMenu(items)
  if (menuItems.length === 0) return ''

  const groups = groupPublicResourceItems(menuItems)
  const blocks: string[] = []

  for (const group of groups) {
    if (group.kind === 'templates') {
      const links = group.items
        .map((item) => resourceLinkHtml(item.title, kindleProfileReadUrl(item.slug)))
        .join('')
      if (links) {
        blocks.push(`<ul class="kindle-read-resources-list">${links}</ul>`)
      }
      continue
    }
    if (group.kind === 'category') {
      const block = renderTopLevelResourceHtml(group.item, fromSlug)
      if (block) blocks.push(block)
      continue
    }
    const kind = libraryKindFromResourceType(
      group.kind === 'spurgeonLibrary'
        ? 'spurgeonLibrary'
        : group.kind === 'morningEveningLibrary'
          ? 'morningEveningLibrary'
          : group.kind === 'calvinLibrary'
            ? 'calvinLibrary'
            : group.kind === 'henryLibrary'
              ? 'henryLibrary'
              : 'edwardsLibrary'
    )
    if (kind) {
      blocks.push(resourceLinkHtml(group.title, kindleReadLibraryIndexUrl(kind, 1, fromSlug)))
    }
  }

  if (blocks.length === 0) return ''

  return blocks
    .map((block) =>
      block.startsWith('<li') ? `<ul class="kindle-read-resources-list">${block}</ul>` : block
    )
    .join('')
}

/** @deprecated Use renderKindleReadMenuNavHtml — standalone Resources dropdown. */
export function renderKindleReadResourcesNavHtml(
  items: PublicResourceItem[],
  fromSlug: string
): string {
  const inner = renderKindleReadResourcesMenuInnerHtml(items, fromSlug)
  if (!inner) return ''

  return `<details class="kindle-read-resources">
    <summary class="kindle-read-resources-title">Resources</summary>
    <div class="kindle-read-resources-body">
      ${inner}
    </div>
  </details>`
}

export function renderKindleReadLibraryListHtml(
  page: KindleReadLibraryPage,
  backHref: string,
  fromSlug?: string
): string {
  const query = page.query?.trim() || ''
  const displayTitle = (row: { slug: string; title: string }) => {
    if (page.kind === 'spurgeon') return spurgeonSermonTitleForModalDisplay(row.title || row.slug)
    if (page.kind === 'edwards') return edwardsSermonTitleForModalDisplay(row.title || row.slug)
    return row.title || row.slug
  }

  const items = page.items
    .map((row) => resourceLinkHtml(displayTitle(row), kindleProfileReadUrl(row.slug)))
    .join('')

  const totalPages = Math.max(1, Math.ceil(page.total / page.pageSize))
  const prev =
    page.page > 1
      ? `<p class="kindle-read-library-pager"><a href="${escapeHtml(kindleReadLibraryIndexUrl(page.kind, page.page - 1, fromSlug, query))}">Previous page</a></p>`
      : ''
  const next =
    page.page < totalPages
      ? `<p class="kindle-read-library-pager"><a href="${escapeHtml(kindleReadLibraryIndexUrl(page.kind, page.page + 1, fromSlug, query))}">Next page</a></p>`
      : ''

  const fromHidden = fromSlug?.trim()
    ? `<input type="hidden" name="from" value="${escapeHtml(fromSlug.trim())}" />`
    : ''
  const clearSearch = query
    ? `<p class="kindle-read-library-clear"><a href="${escapeHtml(kindleReadLibraryIndexUrl(page.kind, 1, fromSlug))}">Clear search</a></p>`
    : ''
  const countLabel = query ? `${page.total} matches` : `${page.total} items`
  const resultsFor = query
    ? `<p class="kindle-read-description">Results for &ldquo;${escapeHtml(query)}&rdquo;</p>`
    : ''

  return `<header class="kindle-read-header kindle-read-library-header">
    <div class="kindle-read-header-inner">
      <p class="kindle-read-site-title">The Gospel Presentation</p>
      <h1 class="kindle-read-profile-title">${escapeHtml(page.title)}</h1>
      <p class="kindle-read-nav"><a href="${escapeHtml(backHref)}">Back</a></p>
      <form class="kindle-read-library-search" method="get" action="/read/libraries/${escapeHtml(page.kind)}/">
        <label class="kindle-read-library-search-label">
          <span class="kindle-read-library-search-heading">Search by title</span>
          <input
            class="kindle-read-library-search-input"
            type="search"
            name="q"
            value="${escapeHtml(query)}"
            autocomplete="off"
          />
        </label>
        ${fromHidden}
        <p class="kindle-read-library-search-actions">
          <button type="submit" class="kindle-read-library-search-submit">Search</button>
        </p>
      </form>
    </div>
  </header>
  <main class="kindle-read-main">
    ${resultsFor}
    ${clearSearch}
    <p class="kindle-read-description">Page ${page.page} of ${totalPages} (${countLabel})</p>
    ${prev}
    <ul class="kindle-read-resources-list kindle-read-library-list">${items || '<li class="kindle-read-resources-note">No items found.</li>'}</ul>
    ${next}
  </main>`
}
