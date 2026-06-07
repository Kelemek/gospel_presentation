import path from 'path'

/** Root for imported OpenBible cross-reference JSON (`gospel-admin/data/crossrefs`). */
export function getCrossReferencesDataRoot(): string {
  return path.join(process.cwd(), 'data', 'crossrefs')
}
