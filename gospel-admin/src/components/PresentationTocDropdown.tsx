'use client'

import { useCallback, useState } from 'react'
import type { GospelSection } from '@/lib/types'
import { scrollToTocAnchor } from '@/lib/scrollToTocAnchor'
import { stripHtmlTags } from '@/lib/stripHtmlTags'

function isTitleBlank(title: string | undefined): boolean {
  return !stripHtmlTags(title ?? '').trim()
}

function handleTocClick(
  e: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  onNavigate?: () => void
) {
  if (!href.startsWith('#')) return
  const id = href.slice(1)
  if (scrollToTocAnchor(id)) {
    e.preventDefault()
    onNavigate?.()
  }
}

const panelClassName =
  'mt-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 shadow-sm overflow-hidden'

const leafLinkBaseClassName =
  'flex items-center gap-2 pr-4 py-3 text-sm font-normal text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-600 last:border-b-0 transition-colors min-w-0'

const nestedLeafLinkBaseClassName =
  'flex items-start gap-2 pr-4 py-2 text-sm font-normal text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-600 last:border-b-0 transition-colors min-w-0 leading-snug line-clamp-3'

/** Slight indent per TOC depth: section → subsection → nested heading. */
const tocLevelIndentClass = ['pl-4', 'pl-7', 'pl-10'] as const

function leafLinkClassName(level: 0 | 1 | 2): string {
  return `${leafLinkBaseClassName} ${tocLevelIndentClass[level]}`
}

function nestedLeafLinkClassName(level: 1 | 2): string {
  return `${nestedLeafLinkBaseClassName} ${tocLevelIndentClass[level]}`
}

const nestedPanelClassName = 'bg-slate-50 dark:bg-slate-700/50'

function visibleSubsectionEntries(section: GospelSection) {
  return section.subsections
    .map((subsection, index) => ({ subsection, index }))
    .filter(({ subsection }) => {
      const nestedSubsections =
        subsection.nestedSubsections?.filter((n) => !isTitleBlank(n.title)) ?? []
      const subsectionTitleBlank = isTitleBlank(subsection.title)
      return !subsectionTitleBlank || nestedSubsections.length > 0
    })
}

function Chevron({ expanded, className = '' }: { expanded: boolean; className?: string }) {
  return (
    <span
      className={`shrink-0 transition-transform ${expanded ? 'rotate-180' : ''} ${className}`.trim()}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </span>
  )
}

function expandableRowShellClassName(): string {
  return 'flex w-full items-stretch border-b border-slate-100 dark:border-slate-600 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors'
}

function expandableRowLinkClassName(level: 0 | 1, emphasized = false): string {
  return `flex flex-1 min-w-0 items-center gap-2 py-3 pr-2 text-sm text-slate-700 dark:text-slate-200 min-h-[44px] ${
    emphasized ? 'font-medium' : 'font-normal'
  } ${tocLevelIndentClass[level]}`
}

function expandableRowToggleClassName(): string {
  return 'flex shrink-0 cursor-pointer items-center justify-center self-stretch py-3 pl-2 pr-4 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600/50 transition-colors'
}

interface TocExpandableRowProps {
  level: 0 | 1
  title: string
  href: string
  expanded: boolean
  onToggle: () => void
  onLinkClick: (e: React.MouseEvent<HTMLAnchorElement>) => void
  emphasized?: boolean
}

function TocExpandableRow({
  level,
  title,
  href,
  expanded,
  onToggle,
  onLinkClick,
  emphasized = false,
}: TocExpandableRowProps) {
  return (
    <div className={expandableRowShellClassName()}>
      <a href={href} onClick={onLinkClick} className={expandableRowLinkClassName(level, emphasized)}>
        <span className="min-w-0">{title}</span>
      </a>
      <button
        type="button"
        onClick={onToggle}
        className={expandableRowToggleClassName()}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${title}`}
      >
        <Chevron expanded={expanded} />
      </button>
    </div>
  )
}

export interface PresentationTocDropdownProps {
  sections: GospelSection[]
  rowClassName: string
  onNavigate?: () => void
}

export default function PresentationTocDropdown({
  sections,
  rowClassName,
  onNavigate,
}: PresentationTocDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(() => new Set())
  const [expandedSubsectionKeys, setExpandedSubsectionKeys] = useState<Set<string>>(() => new Set())

  const collapseAll = useCallback(() => {
    setIsOpen(false)
    setExpandedSectionIds(new Set())
    setExpandedSubsectionKeys(new Set())
  }, [])

  const handleNavigate = useCallback(() => {
    collapseAll()
    onNavigate?.()
  }, [collapseAll, onNavigate])

  const onTocLinkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      handleTocClick(e, href, handleNavigate)
    },
    [handleNavigate]
  )

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSectionIds((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }, [])

  const toggleSubsection = useCallback((key: string) => {
    setExpandedSubsectionKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  if (sections.length === 0) return null

  return (
    <div>
      <button
        type="button"
        data-tour="toc-section-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className={rowClassName}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <svg className="w-5 h-5 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
        Table of Contents
        <Chevron expanded={isOpen} className="ml-auto" />
      </button>
      {isOpen ? (
        <div data-tour="toc-section-links" className={panelClassName} role="list">
          {sections.map((section) => {
            const sectionExpanded = expandedSectionIds.has(section.section)
            const sectionTitle = stripHtmlTags(section.title)
            const subsectionEntries = visibleSubsectionEntries(section)
            const sectionHref = `#section-${section.section}`

            if (subsectionEntries.length === 0) {
              return (
                <a
                  key={section.section}
                  href={sectionHref}
                  data-toc-section={section.section}
                  onClick={(e) => onTocLinkClick(e, sectionHref)}
                  className={leafLinkClassName(0)}
                >
                  <span className="min-w-0 font-medium">{sectionTitle}</span>
                </a>
              )
            }

            return (
              <div key={section.section} data-toc-section={section.section}>
                <TocExpandableRow
                  level={0}
                  title={sectionTitle}
                  href={sectionHref}
                  expanded={sectionExpanded}
                  onToggle={() => toggleSection(section.section)}
                  onLinkClick={(e) => onTocLinkClick(e, sectionHref)}
                  emphasized
                />
                {sectionExpanded ? (
                  <div className={nestedPanelClassName} role="list">
                    {subsectionEntries.map(({ subsection, index }) => {
                      const nestedSubsections =
                        subsection.nestedSubsections?.filter((n) => !isTitleBlank(n.title)) ?? []
                      const hasVisibleNested = nestedSubsections.length > 0
                      const subsectionTitleBlank = isTitleBlank(subsection.title)
                      if (subsectionTitleBlank && !hasVisibleNested) return null

                      const subsectionKey = `${section.section}-${index}`

                      if (!hasVisibleNested) {
                        if (subsectionTitleBlank) return null
                        return (
                          <a
                            key={subsectionKey}
                            href={`#section-${section.section}-${index}`}
                            onClick={(e) =>
                              onTocLinkClick(e, `#section-${section.section}-${index}`)
                            }
                            className={leafLinkClassName(1)}
                          >
                            <span className="min-w-0">{stripHtmlTags(subsection.title)}</span>
                          </a>
                        )
                      }

                      const subsectionExpanded = expandedSubsectionKeys.has(subsectionKey)
                      const subsectionTitle = subsectionTitleBlank
                        ? 'More'
                        : stripHtmlTags(subsection.title)
                      const subsectionHref = `#section-${section.section}-${index}`
                      return (
                        <div key={subsectionKey}>
                          <TocExpandableRow
                            level={1}
                            title={subsectionTitle}
                            href={subsectionHref}
                            expanded={subsectionExpanded}
                            onToggle={() => toggleSubsection(subsectionKey)}
                            onLinkClick={(e) => onTocLinkClick(e, subsectionHref)}
                          />
                          {subsectionExpanded ? (
                            <div className={nestedPanelClassName}>
                              {nestedSubsections.map((nested, nestedIndex) => {
                                const originalNestedIndex =
                                  subsection.nestedSubsections!.indexOf(nested)
                                const nestedTitle = stripHtmlTags(nested.title)
                                return (
                                  <a
                                    key={`${subsectionKey}-${nestedIndex}`}
                                    href={`#section-${section.section}-${index}-${originalNestedIndex}`}
                                    title={nestedTitle}
                                    onClick={(e) =>
                                      onTocLinkClick(
                                        e,
                                        `#section-${section.section}-${index}-${originalNestedIndex}`
                                      )
                                    }
                                    className={nestedLeafLinkClassName(2)}
                                  >
                                    <span className="min-w-0">{nestedTitle}</span>
                                  </a>
                                )
                              })}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
