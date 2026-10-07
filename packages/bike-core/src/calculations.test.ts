import { describe, expect, it } from 'vitest'
import { compareSessions, relativeTension, summarizeSide, summarizeTensions } from './calculations'
describe('tension calculations', () => {
  it('calculates summary and target deviation', () => expect(summarizeTensions([90, 100, 110], 100)).toMatchObject({ count: 3, average: 100, minimum: 90, maximum: 110, range: 20, targetDeviationPercent: 0 }))
  it('ignores missing and invalid values', () => expect(summarizeTensions([100, null, 0, -2, Number.NaN]).average).toBe(100))
  it('handles an empty session', () => expect(summarizeTensions([]).average).toBeNull())
  it('separates sides', () => expect(summarizeSide([{ spokeNumber: 1, positionIndex: 0, side: 'left', tension: 70 }, { spokeNumber: 2, positionIndex: 0, side: 'right', tension: 120 }], 'right').average).toBe(120))
  it('calculates relative tension', () => expect(relativeTension(90, 100)).toBe(90))
  it('compares sessions', () => expect(compareSessions([{ spokeNumber: 1, positionIndex: 0, side: 'left', tension: 105 }], [{ spokeNumber: 1, positionIndex: 0, side: 'left', tension: 100 }])[0]?.change).toBe(5))
  it('supports unusual counts', () => expect(summarizeTensions(Array(41).fill(100)).count).toBe(41))
})
