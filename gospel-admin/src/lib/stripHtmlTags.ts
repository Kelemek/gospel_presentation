/** Plain text from HTML string (browser only; safe for client components). */
export function stripHtmlTags(html: string): string {
  if (html == null || typeof html !== 'string') return ''
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '')
  const temp = document.createElement('div')
  temp.innerHTML = html
  return temp.textContent || temp.innerText || ''
}
