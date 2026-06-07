export interface CrossReferenceTarget {
  passageKey: string
  reference: string
  votes: number
}

export interface CrossReferenceLookupResult {
  reference: string
  total: number
  offset: number
  limit: number
  items: CrossReferenceTarget[]
}
