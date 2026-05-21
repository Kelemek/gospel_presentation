import path from 'path'

/** Root for imported STEPBible JSON (`gospel-admin/data/stepbible`). */
export function getStepBibleDataRoot(): string {
  return path.join(process.cwd(), 'data', 'stepbible')
}
