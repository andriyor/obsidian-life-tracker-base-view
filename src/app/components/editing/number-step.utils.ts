import type { NumberRange } from '../../types'
import { clampToRange } from '../../../utils'

/**
 * Fallback step for the −/+ quick buttons when the property defines no step
 * (counter-style properties: glasses of water, pushups — issue #125).
 */
export const DEFAULT_NUMBER_STEP = 1

/** Round away binary-float noise from repeated fractional steps (0.1 + 0.2). */
function roundStep(value: number): number {
    return Math.round(value * 1e6) / 1e6
}

/**
 * Step size the −/+ buttons apply: the property's own step when it defines a
 * positive one, otherwise 1.
 */
export function stepSizeFor(range: NumberRange | null): number {
    return range?.step != null && range.step > 0 ? range.step : DEFAULT_NUMBER_STEP
}

/**
 * Value one step away from `current`, clamped to the property's range.
 *
 * From an empty field (`current === null`):
 * - a range starting above 0 lands on its minimum either way, so a 1-5 mood
 *   becomes 1, not 2
 * - otherwise + counts one step up from 0, so the first tap on a 0-30 water
 *   counter logs 1 rather than a 0 that looks like nothing happened (issue
 *   #122); − lands on the range minimum, or 0 when unbounded, which is how a
 *   deliberate "zero today" is entered
 */
export function computeSteppedValue(
    current: number | null,
    direction: -1 | 1,
    range: NumberRange | null
): number {
    const stepSize = stepSizeFor(range)

    let next: number
    if (current === null) {
        if (range && range.min > 0) {
            next = range.min
        } else if (direction === 1) {
            next = stepSize
        } else {
            next = range ? range.min : 0
        }
    } else {
        next = roundStep(current + direction * stepSize)
    }

    return clampToRange(next, range) ?? next
}
