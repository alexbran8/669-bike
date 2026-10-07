import type { TensionMeasurement, WheelSide } from './types'
export interface TensionStats { count: number; average: number | null; minimum: number | null; maximum: number | null; range: number | null; variance: number | null; standardDeviation: number | null; targetDifference: number | null; targetDeviationPercent: number | null }
export function summarizeTensions(values: Array<number | null | undefined>, target?: number | null): TensionStats {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)
  if (!valid.length) return { count: 0, average: null, minimum: null, maximum: null, range: null, variance: null, standardDeviation: null, targetDifference: null, targetDeviationPercent: null }
  const average = valid.reduce((sum, value) => sum + value, 0) / valid.length
  const minimum = Math.min(...valid); const maximum = Math.max(...valid)
  const variance = valid.reduce((sum, value) => sum + (value - average) ** 2, 0) / valid.length
  const targetDifference = target && target > 0 ? average - target : null
  return { count: valid.length, average, minimum, maximum, range: maximum - minimum, variance, standardDeviation: Math.sqrt(variance), targetDifference, targetDeviationPercent: targetDifference === null || !target ? null : (targetDifference / target) * 100 }
}
export function summarizeSide(measurements: TensionMeasurement[], side: WheelSide, target?: number | null) { return summarizeTensions(measurements.filter((item) => item.side === side).map((item) => item.tension), target) }
export function relativeTension(value: number, average: number | null) { return average && average > 0 && Number.isFinite(value) ? (value / average) * 100 : null }
export function compareSessions(current: TensionMeasurement[], previous: TensionMeasurement[]) {
  const prior = new Map(previous.map((item) => [`${item.side}:${item.positionIndex}`, item.tension]))
  return current.map((item) => ({ ...item, change: item.tension - (prior.get(`${item.side}:${item.positionIndex}`) ?? item.tension) }))
}
