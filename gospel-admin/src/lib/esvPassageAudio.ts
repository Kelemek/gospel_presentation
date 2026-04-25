/**
 * Resolves the ESV API passage-audio redirect chain to a final MP3 URL.
 * @see https://api.esv.org/docs/passage-audio/
 */
export async function resolveEsvPassageAudioUrl(reference: string): Promise<string | null> {
  const apiToken = process.env.ESV_API_TOKEN
  if (!apiToken) {
    return null
  }
  const q = reference.trim()
  if (!q) return null

  let url = `https://api.esv.org/v3/passage/audio/?q=${encodeURIComponent(q)}`
  for (let hop = 0; hop < 8; hop += 1) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Token ${apiToken}`,
      },
      redirect: 'manual',
    })
    if (response.status >= 300 && response.status < 400) {
      const loc = response.headers.get('location')
      if (!loc) return null
      url = new URL(loc, url).toString()
      continue
    }
    if (!response.ok) {
      return null
    }
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('audio') || /\.mp3(\?|$)/i.test(url)) {
      return url
    }
    return null
  }
  return null
}
