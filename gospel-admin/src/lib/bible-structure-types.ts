export type BibleBookPublic = {
  id: string
  name: string
  nameLong: string
  testament: 'ot' | 'nt'
  chapters: { id: string; number: string; verseCount: number }[]
}
