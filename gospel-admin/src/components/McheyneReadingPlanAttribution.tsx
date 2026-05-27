import {
  MCHEYNE_COPYRIGHT_ANCHOR_ID,
  MCHEYNE_READING_PLAN_ATTRIBUTION,
} from '@/lib/mcheyne/mcheyneCopyrightAttribution'

const linkClass =
  'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors break-all'

type Props = {
  className?: string
}

export function McheyneReadingPlanAttribution({ className = '' }: Props) {
  const { title, body, scheduleSourceLabel, scheduleSourceHref, closing } =
    MCHEYNE_READING_PLAN_ATTRIBUTION

  return (
    <div
      id={MCHEYNE_COPYRIGHT_ANCHOR_ID}
      className={`bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-600 rounded-lg p-6 scroll-mt-24 ${className}`.trim()}
    >
      <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
        <strong className="text-slate-800 dark:text-slate-100">{title}:</strong> {body}{' '}
        <a href={scheduleSourceHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {scheduleSourceLabel}
        </a>{' '}
        project. {closing}
      </p>
    </div>
  )
}
