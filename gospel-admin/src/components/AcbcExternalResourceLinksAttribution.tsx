import {
  ACBC_EXTERNAL_LINKS_COPYRIGHT_ANCHOR_ID,
  ACBC_EXTERNAL_RESOURCE_LINKS_ATTRIBUTION,
} from '@/lib/acbcExternalLinksCopyrightAttribution'

const linkClass =
  'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors break-all'

type Props = {
  className?: string
}

export function AcbcExternalResourceLinksAttribution({ className = '' }: Props) {
  const {
    title,
    body,
    organizationLabel,
    organizationHref,
    resourceLibraryLabel,
    resourceLibraryHref,
    topicIndexLabel,
    topicIndexHref,
    scriptureIndexLabel,
    scriptureIndexHref,
    closing,
  } = ACBC_EXTERNAL_RESOURCE_LINKS_ATTRIBUTION

  return (
    <div
      id={ACBC_EXTERNAL_LINKS_COPYRIGHT_ANCHOR_ID}
      className={`bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-600 rounded-lg p-6 scroll-mt-24 ${className}`.trim()}
    >
      <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
        <strong className="text-slate-800 dark:text-slate-100">{title}:</strong> {body}{' '}
        <a href={organizationHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {organizationLabel}
        </a>
        ,{' '}
        <a href={resourceLibraryHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {resourceLibraryLabel}
        </a>
        ,{' '}
        <a href={topicIndexHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {topicIndexLabel}
        </a>
        , and{' '}
        <a href={scriptureIndexHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {scriptureIndexLabel}
        </a>
        . {closing}
      </p>
    </div>
  )
}
