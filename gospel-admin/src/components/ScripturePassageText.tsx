'use client'

import { useLongPress } from '@/hooks/useLongPress'
import type { Ref } from 'react'

const PASSAGE_TEXT_CLASS =
  'text-slate-700 dark:text-slate-200 leading-relaxed text-lg md:text-xl select-none'

export interface ScripturePassageTextProps {
  html: string
  className?: string
  id?: string
  'data-tour'?: string
  onLongPress?: () => void
  innerRef?: Ref<HTMLDivElement>
}

export default function ScripturePassageText({
  html,
  className,
  id,
  'data-tour': dataTour,
  onLongPress,
  innerRef,
}: ScripturePassageTextProps) {
  const longPressHandlers = useLongPress({
    onLongPress: onLongPress ?? (() => {}),
    disabled: !onLongPress,
  })

  return (
    <div
      ref={innerRef}
      id={id}
      data-tour={dataTour}
      className={className ?? PASSAGE_TEXT_CLASS}
      dangerouslySetInnerHTML={{ __html: html }}
      {...(onLongPress ? longPressHandlers : {})}
    />
  )
}
