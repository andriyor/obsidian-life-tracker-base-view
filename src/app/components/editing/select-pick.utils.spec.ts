import { describe, expect, test } from 'bun:test'
import { SelectPickTracker } from './select-pick.utils'

describe('SelectPickTracker', () => {
    test('a change with no prior keyboard input is a pick', () => {
        expect(new SelectPickTracker().isPick()).toBe(true)
    })

    test('a change after a pointer down is a pick', () => {
        const tracker = new SelectPickTracker()
        tracker.onPointerDown()
        expect(tracker.isPick()).toBe(true)
    })

    test('a change driven by arrow keys or type-ahead is not a pick', () => {
        for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'g']) {
            const tracker = new SelectPickTracker()
            tracker.onKeyDown(key)
            expect(tracker.isPick()).toBe(false)
        }
    })

    test('keyboard browsing stays a non-pick across consecutive changes', () => {
        const tracker = new SelectPickTracker()
        tracker.onKeyDown('ArrowDown')
        expect(tracker.isPick()).toBe(false)
        expect(tracker.isPick()).toBe(false)
    })

    test('Enter does not mark keyboard browsing', () => {
        const tracker = new SelectPickTracker()
        tracker.onKeyDown('Enter')
        expect(tracker.isPick()).toBe(true)
    })

    test('a pointer interaction after keyboard browsing makes picks count again', () => {
        const tracker = new SelectPickTracker()
        tracker.onKeyDown('ArrowDown')
        tracker.onPointerDown()
        expect(tracker.isPick()).toBe(true)
    })
})
