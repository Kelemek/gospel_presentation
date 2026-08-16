'use client'

import { useEffect } from 'react'
import {
  subscribeExclusiveListenPreemption,
  type GospelExclusiveListenOwner,
} from '@/lib/gospelExclusiveListen'

/** Stop this Listen surface when another owner claims exclusive playback. */
export function useExclusiveListenPreemption(
  onPreempted: () => void,
  self: GospelExclusiveListenOwner
): void {
  useEffect(() => {
    return subscribeExclusiveListenPreemption(() => onPreempted(), { self })
  }, [onPreempted, self])
}
