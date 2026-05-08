import * as Sentry from '@sentry/nextjs'
import { attachSupabaseContextFromHint } from '../sentrySupabaseHintContext'

jest.mock('@sentry/nextjs', () => ({
  setContext: jest.fn(),
}))

describe('attachSupabaseContextFromHint', () => {
  beforeEach(() => {
    jest.mocked(Sentry.setContext).mockClear()
  })

  it('attaches context when message mentions supabase', () => {
    attachSupabaseContextFromHint(
      { originalException: { message: 'supabase client failed', code: '42', details: 'x', hint: 'y' } },
      false
    )
    expect(Sentry.setContext).toHaveBeenCalledWith('supabase', {
      errorCode: '42',
      details: 'x',
      hint: 'y',
    })
  })

  it('attaches context when code is present without supabase in message', () => {
    attachSupabaseContextFromHint({ originalException: { message: 'other', code: 'PGRST301' } }, true)
    expect(Sentry.setContext).toHaveBeenCalledWith('supabase', {
      errorCode: 'PGRST301',
      details: undefined,
      hint: undefined,
      message: 'other',
    })
  })

  it('does nothing when exception is not object-like', () => {
    attachSupabaseContextFromHint({ originalException: 'string' }, false)
    expect(Sentry.setContext).not.toHaveBeenCalled()
  })

  it('does nothing when message omits supabase and code', () => {
    attachSupabaseContextFromHint({ originalException: { message: 'generic error' } }, false)
    expect(Sentry.setContext).not.toHaveBeenCalled()
  })
})
