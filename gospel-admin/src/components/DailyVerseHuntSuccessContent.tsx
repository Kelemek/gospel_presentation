import { DAILY_VERSE_HUNT_TOMORROW_MESSAGE } from '@/lib/dailyVerseChallenge'

type DailyVerseHuntSuccessContentProps = {
  encouragementMessage: string
  reference: string
  variant?: 'card' | 'modal'
}

export function DailyVerseHuntSuccessContent({
  encouragementMessage,
  reference,
  variant = 'card',
}: DailyVerseHuntSuccessContentProps) {
  const isModal = variant === 'modal'

  return (
    <div
      className={
        isModal
          ? 'space-y-1.5 text-base text-slate-800 dark:text-slate-100'
          : 'space-y-1.5 text-sm text-blue-900 dark:text-blue-100'
      }
    >
      {encouragementMessage ? (
        <p className="leading-snug">{encouragementMessage}</p>
      ) : null}
      <p className="flex items-center gap-1.5 font-medium leading-snug">
        <span className="text-green-600 dark:text-green-400 shrink-0" aria-hidden="true">
          ✓
        </span>
        <span>
          You found{' '}
          <span
            className={
              isModal
                ? 'text-slate-900 dark:text-slate-50'
                : 'text-blue-800 dark:text-blue-200'
            }
          >
            {reference}
          </span>
        </span>
      </p>
      <p
        className={
          isModal
            ? 'text-sm leading-snug text-slate-600 dark:text-slate-400'
            : 'text-xs leading-snug text-blue-700/90 dark:text-blue-300/90'
        }
      >
        {DAILY_VERSE_HUNT_TOMORROW_MESSAGE}
      </p>
    </div>
  )
}
