'use client'

import { useEffect, useRef } from 'react'
import {
  captureModalOpened,
  type ModalAnalyticsName,
  type ModalOpenedProperties,
} from '@/lib/posthog-analytics'

type ModalOpenProperties = Omit<ModalOpenedProperties, 'modal'>

/** Fire `modal_opened` once when `isOpen` transitions false → true. */
export function usePostHogModalOpen(
  modal: ModalAnalyticsName,
  isOpen: boolean,
  properties?: ModalOpenProperties
): void {
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      captureModalOpened({ modal, ...properties })
    }
    wasOpenRef.current = isOpen
  }, [isOpen, modal, properties])
}

/** Fire `modal_opened` once when the component mounts (unmount/remount = new open). */
export function usePostHogModalMount(
  modal: ModalAnalyticsName,
  properties?: ModalOpenProperties
): void {
  useEffect(() => {
    captureModalOpened({ modal, ...properties })
    // Mount-only: intentional empty deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
