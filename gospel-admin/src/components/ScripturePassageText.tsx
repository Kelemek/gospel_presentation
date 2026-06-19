'use client'

import { useLongPress } from '@/hooks/useLongPress'
import type { KeyboardEvent, MouseEvent, Ref } from 'react'

const PASSAGE_TEXT_CLASS =
  'text-slate-700 dark:text-slate-200 leading-relaxed text-lg md:text-xl select-none'

function verseNumberFromEventTarget(target: EventTarget | null): number | null {
  if (!(target instanceof Element)) return null
  const el = target.closest('[data-scripture-verse]')
  if (!el) return null
  const verse = Number.parseInt(el.getAttribute('data-scripture-verse') ?? '', 10)
  return Number.isFinite(verse) && verse > 0 ? verse : null
}

export interface ScripturePassageTextProps {
  html: string
  className?: string
  id?: string
  'data-tour'?: string
  onLongPress?: () => void
  onVerseNumberClick?: (verse: number) => void
  innerRef?: Ref<HTMLDivElement>
}

export default function ScripturePassageText({
  html,
  className,
  id,
  'data-tour': dataTour,
  onLongPress,
  onVerseNumberClick,
  innerRef,
}: ScripturePassageTextProps) {
  const longPressHandlers = useLongPress({
    onLongPress: onLongPress ?? (() => {}),
    disabled: !onLongPress,
  })

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!onVerseNumberClick) return
    const verse = verseNumberFromEventTarget(event.target)
    if (verse === null) return
    event.preventDefault()
    event.stopPropagation()
    onVerseNumberClick(verse)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onVerseNumberClick) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    const verse = verseNumberFromEventTarget(event.target)
    if (verse === null) return
    event.preventDefault()
    event.stopPropagation()
    onVerseNumberClick(verse)
  }

  return (
    <div
      ref={innerRef}
      id={id}
      data-tour={dataTour}
      className={className ?? PASSAGE_TEXT_CLASS}
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={onVerseNumberClick ? handleClick : undefined}
      onKeyDown={onVerseNumberClick ? handleKeyDown : undefined}
      {...(onLongPress ? longPressHandlers : {})}
    />
  )
}
