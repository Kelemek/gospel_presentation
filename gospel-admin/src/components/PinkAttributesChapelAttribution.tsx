import {
  PINK_ATTRIBUTES_CHAPEL_COPYRIGHT_NOTICE,
  PINK_ATTRIBUTES_COPYRIGHT_ANCHOR_ID,
} from '@/lib/pinkAttributes/pinkAttributesCopyrightAttribution'

const linkClass =
  'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors break-all'

type Props = {
  className?: string
}

export function PinkAttributesChapelAttribution({ className = '' }: Props) {
  const notice = PINK_ATTRIBUTES_CHAPEL_COPYRIGHT_NOTICE

  return (
    <div
      id={PINK_ATTRIBUTES_COPYRIGHT_ANCHOR_ID}
      className={`bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-600 rounded-lg p-6 scroll-mt-24 space-y-3 ${className}`.trim()}
    >
      <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
        <strong className="text-slate-800 dark:text-slate-100">{notice.title}</strong>
      </p>
      <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
        {notice.editionLine}
      </p>
      <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
        {notice.copyrightGrant}
      </p>
      <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg pl-4">
        {notice.condition1}
        <br />
        {notice.condition2}
      </p>
      <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
        {notice.studyGuide}
      </p>
      <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
        {notice.publisherLine}
      </p>
      <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
        Text in this app was imported from the{' '}
        <a href={notice.sourceHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {notice.sourceLabel}
        </a>
        .
      </p>
    </div>
  )
}
