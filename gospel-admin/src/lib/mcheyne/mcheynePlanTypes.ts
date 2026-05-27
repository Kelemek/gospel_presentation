export type McheynePlanDay = {
  day: number
  month: number
  monthDay: number
  family: [string, string]
  secret: [string, string]
}

export type McheynePlanFile = {
  version: 1
  leapDayNote: string
  days: McheynePlanDay[]
}
