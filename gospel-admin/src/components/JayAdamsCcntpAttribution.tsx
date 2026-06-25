import {
  JAY_ADAMS_CCNT_P_BOOKSTORE_URL,
  JAY_ADAMS_CCNT_P_COPYRIGHT_ANCHOR_ID,
  JAY_ADAMS_CCNT_P_COPYRIGHT_NOTICE,
} from '@/lib/jayAdams/jayAdamsCcntpCopyrightAttribution'

const linkClass =
  'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors break-all'

type Props = {
  className?: string
}

export function JayAdamsCcntpAttribution({ className = '' }: Props) {
  const notice = JAY_ADAMS_CCNT_P_COPYRIGHT_NOTICE

  return (
    <div
      id={JAY_ADAMS_CCNT_P_COPYRIGHT_ANCHOR_ID}
      className={`bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-600 rounded-lg p-6 scroll-mt-24 space-y-3 ${className}`.trim()}
    >
      <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
        <strong className="text-slate-800 dark:text-slate-100">{notice.title}</strong>
      </p>
      <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
        {notice.permissionQuote}
      </p>
      <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
        {notice.thanks}
      </p>
      <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
        {notice.closing}
      </p>
      <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg min-w-0">
        <a
          href={JAY_ADAMS_CCNT_P_BOOKSTORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          {notice.bookstoreLinkLabel}
        </a>
      </p>
    </div>
  )
}
