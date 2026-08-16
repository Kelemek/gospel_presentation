export type ProfileContentSearchParams = {
  studyRefParam: string
  scriptureRefParam: string
  scriptureViewParam: string
  translationParam: string
  mcheynePlanDayParam: string
  mcheyneResumePinParam: string
}

export function parseProfileContentSearchParams(
  searchParams: Pick<URLSearchParams, 'get'>
): ProfileContentSearchParams {
  return {
    studyRefParam: searchParams.get('studyRef')?.trim() ?? '',
    scriptureRefParam: searchParams.get('scriptureRef')?.trim().replace(/–/g, '-') ?? '',
    scriptureViewParam: searchParams.get('scriptureView')?.trim() ?? '',
    translationParam: searchParams.get('translation')?.trim().toLowerCase() ?? '',
    mcheynePlanDayParam: searchParams.get('planDay')?.trim() ?? '',
    mcheyneResumePinParam: searchParams.get('resumePin')?.trim() ?? '',
  }
}
