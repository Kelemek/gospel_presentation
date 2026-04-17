/**
 * Book title used in user-facing scripture references (matches profile content / API.Bible "Psalm" for PSA).
 */
export function referenceBookNameFromApiBook(bookId: string, apiName: string): string {
  if (bookId === 'PSA') return 'Psalm'
  return apiName
}
