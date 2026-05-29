'use client'

import { useLongPress } from '@/hooks/useLongPress'

const PASSAGE_TEXT_CLASS =
  'text-slate-700 dark:text-slate-200 leading-relaxed text-lg md:text-xl'

export interface ScripturePassageTextProps {
  html: string
  className?: string
  id?: string
  'data-tour'?: string
  onLongPress?: () => void
}

export default function ScripturePassageText({
  html,
  className,
  id,
  'data-tour': dataTour,
  onLongPress,
}: ScripturePassageTextProps) {
  const longPressHandlers = useLongPress({
    onLongPress: onLongPress ?? (() => {}),
    disabled: !onLongPress,
  })

  return (
    <div
      id={id}
      data-tour={dataTour}
      className={className ?? PASSAGE_TEXT_CLASS}
      dangerouslySetInnerHTML={{ __html: html }}
      {...(onLongPress ? longPressHandlers : {})}
    />
  )
}
