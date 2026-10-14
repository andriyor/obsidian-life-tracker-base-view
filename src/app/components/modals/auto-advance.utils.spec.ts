import { describe, expect, test } from 'bun:test'
import { AutoAdvanceScheduler, shouldAutoAdvance } from './auto-advance.utils'

describe('shouldAutoAdvance', () => {
    test('advances after a pick when enabled', () => {
        expect(shouldAutoAdvance({ enabled: true, value: 'good', isLastProperty: false })).toBe(
            true
        )
        expect(shouldAutoAdvance({ enabled: true, value: false, isLastProperty: false })).toBe(true)
        expect(shouldAutoAdvance({ enabled: true, value: 0, isLastProperty: false })).toBe(true)
    })

    test('does nothing when the setting is off', () => {
        expect(shouldAutoAdvance({ enabled: false, value: 'good', isLastProperty: false })).toBe(
            false
        )
    })

    test('stays on the last property instead of closing or switching files', () => {
        expect(shouldAutoAdvance({ enabled: true, value: 'good', isLastProperty: true })).toBe(
            false
        )
    })

    test('does not advance when the pick cleared the value', () => {
        for (const value of ['', null, undefined]) {
            expect(shouldAutoAdvance({ enabled: true, value, isLastProperty: false })).toBe(false)
        }
    })
})

/** Manual clock: timers fire only when the test calls `runAll` */
function createFakeTimers() {
    let nextId = 1
    const pending = new Map<number, () => void>()
    return {
        pending,
        timers: {
            setTimeout: (callback: () => void) => {
                const id = nextId++
                pending.set(id, callback)
                return id
            },
            clearTimeout: (id: number) => {
                pending.delete(id)
            }
        },
        runAll: () => {
            const callbacks = [...pending.values()]
            pending.clear()
            callbacks.forEach((callback) => callback())
        }
    }
}

describe('AutoAdvanceScheduler', () => {
    test('fires the advance once the delay elapses', () => {
        const fake = createFakeTimers()
        const scheduler = new AutoAdvanceScheduler(fake.timers)
        let advances = 0

        scheduler.schedule(() => advances++)
        expect(scheduler.isPending()).toBe(true)

        fake.runAll()
        expect(advances).toBe(1)
        expect(scheduler.isPending()).toBe(false)
    })

    test('cancel drops the pending advance', () => {
        const fake = createFakeTimers()
        const scheduler = new AutoAdvanceScheduler(fake.timers)
        let advances = 0

        scheduler.schedule(() => advances++)
        scheduler.cancel()
        fake.runAll()

        expect(advances).toBe(0)
        expect(scheduler.isPending()).toBe(false)
    })

    test('a new pick replaces the pending advance instead of stacking a second one', () => {
        const fake = createFakeTimers()
        const scheduler = new AutoAdvanceScheduler(fake.timers)
        const fired: string[] = []

        scheduler.schedule(() => fired.push('first'))
        scheduler.schedule(() => fired.push('second'))
        expect(fake.pending.size).toBe(1)

        fake.runAll()
        expect(fired).toEqual(['second'])
    })

    test('cancel with nothing pending is a no-op', () => {
        const fake = createFakeTimers()
        const scheduler = new AutoAdvanceScheduler(fake.timers)
        expect(() => scheduler.cancel()).not.toThrow()
        expect(scheduler.isPending()).toBe(false)
    })
})
