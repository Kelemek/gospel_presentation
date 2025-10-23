// Types for Gospel Presentation Data Structure

export interface ScriptureReference {
  reference: string
  text?: string
}

export interface NestedSubsection {
  title: string
  content: string
  scriptureReferences?: ScriptureReference[]
}

export interface Subsection {
  title: string
  content: string
  scriptureReferences?: ScriptureReference[]
  nestedSubsections?: NestedSubsection[]
}

export interface GospelSection {
  section: string
  title: string
  subsections: Subsection[]
}

export type GospelPresentationData = GospelSection[]