import { renderHook } from '@testing-library/react'
import { useProfileContentBootstrap } from '@/hooks/useProfileContentBootstrap'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams('studyRef=Romans+8%3A1'),
}))

jest.mock('@/contexts/AlertModalContext', () => ({
  useAlertModal: () => ({ showConfirm: jest.fn(), showAlert: jest.fn() }),
}))

jest.mock('@/contexts/TranslationContext', () => ({
  useTranslation: () => ({
    translation: 'ESV',
    enabledTranslations: ['ESV'],
    isLoading: false,
    setTranslation: jest.fn(),
  }),
}))

jest.mock('@/hooks/useClientHydrated', () => ({ useClientHydrated: () => true }))
jest.mock('@/hooks/useProfileCanEdit', () => ({ useProfileCanEdit: () => false }))
jest.mock('@/hooks/usePrefetchPublicResourcesMenu', () => ({
  usePrefetchPublicResourcesMenu: jest.fn(),
}))
jest.mock('@/hooks/useProfileSectionHashScroll', () => ({
  useProfileSectionHashScroll: jest.fn(),
}))
jest.mock('@/hooks/useProfileVisitTracking', () => ({
  useProfileVisitTracking: jest.fn(),
}))
jest.mock('@/hooks/useProfileLastOpenOnEnter', () => ({
  useProfileLastOpenOnEnter: jest.fn(),
}))
jest.mock('@/hooks/useProfileStudyRefScroll', () => ({
  useProfileStudyRefScroll: jest.fn(),
}))
jest.mock('@/hooks/usePresentationScrollReadComplete', () => ({
  usePresentationScrollReadComplete: jest.fn(),
}))
jest.mock('@/hooks/useProfilePersistBeforeLeave', () => ({
  useProfilePersistBeforeLeave: () => ({
    registerPersistBeforeLeave: jest.fn(),
    persistReadingResumeBeforeLeave: jest.fn(),
  }),
}))

import { usePrefetchPublicResourcesMenu } from '@/hooks/usePrefetchPublicResourcesMenu'
import { useProfileLastOpenOnEnter } from '@/hooks/useProfileLastOpenOnEnter'
import { useProfileSectionHashScroll } from '@/hooks/useProfileSectionHashScroll'
import { useProfileStudyRefScroll } from '@/hooks/useProfileStudyRefScroll'
import { useProfileVisitTracking } from '@/hooks/useProfileVisitTracking'
import { usePresentationScrollReadComplete } from '@/hooks/usePresentationScrollReadComplete'

const profileInfo = {
  title: 'Default',
  slug: 'default',
  favoriteScriptures: [],
}

const sections = [{ id: 's1', title: 'Section', subsections: [] }]

describe('useProfileContentBootstrap', () => {
  it('wires lifecycle hooks and search params from the URL', () => {
    const { result } = renderHook(() =>
      useProfileContentBootstrap({
        sections: sections as never,
        profileInfo,
      })
    )

    expect(usePrefetchPublicResourcesMenu).toHaveBeenCalled()
    expect(useProfileSectionHashScroll).toHaveBeenCalledWith(true, 1, 'default')
    expect(useProfileVisitTracking).toHaveBeenCalledWith('default', true)
    expect(useProfileLastOpenOnEnter).toHaveBeenCalledWith('default', 'Default')
    expect(useProfileStudyRefScroll).toHaveBeenCalledWith(
      true,
      1,
      'default',
      'Romans 8:1',
      sections
    )
    expect(usePresentationScrollReadComplete).toHaveBeenCalledWith('default')
    expect(result.current.studyRefParam).toBe('Romans 8:1')
    expect(result.current.footerAttributionEnabledCodes).toEqual(['ESV'])
  })
})
