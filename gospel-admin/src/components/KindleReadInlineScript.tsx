type KindleReadInlineScriptProps = {
  scriptId: string
  scriptContent: string
}

/** Inline Kindle scripts in the SSR HTML stream (Silk executes these; client injection does not). */
export default function KindleReadInlineScript({
  scriptId,
  scriptContent,
}: KindleReadInlineScriptProps) {
  return (
    <script
      id={scriptId}
      dangerouslySetInnerHTML={{
        __html: scriptContent,
      }}
    />
  )
}
