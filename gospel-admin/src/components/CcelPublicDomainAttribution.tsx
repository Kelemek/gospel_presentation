import {
  CCEL_COPYRIGHT_POLICY_URL,
  type CcelCopyrightAttribution,
} from '@/lib/ccelCopyrightAttributions'

const linkClass =
  'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors break-all'

type Props = {
  attribution: CcelCopyrightAttribution
  className?: string
}

export function CcelPublicDomainAttribution({ attribution, className = '' }: Props) {
  const { title, body, sourceHref } = attribution
  return (
    <div
      className={`bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-600 rounded-lg p-6 ${className}`.trim()}
    >
      <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
        <strong className="text-slate-800 dark:text-slate-100">{title}:</strong> {body} on the{' '}
        <a href={sourceHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Christian Classics Ethereal Library (CCEL)
        </a>
        . See also{' '}
        <a
          href={CCEL_COPYRIGHT_POLICY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          CCEL copyright information
        </a>
        .
      </p>
    </div>
  )
}
