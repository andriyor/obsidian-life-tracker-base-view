import { describe, expect, test } from 'bun:test'
import { createDefaultPropertyDefinition, type PropertyDefinition } from '../types'
import {
    applyQuickAddAction,
    findQuickAddDefinition,
    isShownInQuickAdd,
    parseQuickAddParams,
    resolveQuickAddDate,
    type QuickAddAction
} from './quick-add.utils'

function makeDef(overrides: Partial<PropertyDefinition> = {}): PropertyDefinition {
    return { ...createDefaultPropertyDefinition('id', 0), name: 'prop', ...overrides }
}

describe('isShownInQuickAdd', () => {
    test('defaults to numbers and checkboxes', () => {
        expect(isShownInQuickAdd(makeDef({ type: 'number' }))).toBe(true)
        expect(isShownInQuickAdd(makeDef({ type: 'checkbox' }))).toBe(true)
        for (const type of ['text', 'date', 'datetime', 'list', 'tags'] as const) {
            expect(isShownInQuickAdd(makeDef({ type }))).toBe(false)
        }
    })

    test('an explicit choice wins over the type default', () => {
        expect(isShownInQuickAdd(makeDef({ type: 'number', showInQuickAdd: false }))).toBe(false)
        expect(isShownInQuickAdd(makeDef({ type: 'text', showInQuickAdd: true }))).toBe(true)
    })
})

describe('resolveQuickAddDate', () => {
    const now = new Date(2026, 9, 14, 15, 30)

    test('uses the open daily note date', () => {
        const date = resolveQuickAddDate('Journal/2026-10-04.md', now)
        expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 4])
        expect(date.getHours()).toBe(0)
    })

    test('falls back to today without a daily note', () => {
        for (const path of [null, 'Notes/Some idea.md', 'Journal/2026-W41.md']) {
            const date = resolveQuickAddDate(path, now)
            expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 14])
            expect(date.getHours()).toBe(0)
        }
    })
})

describe('parseQuickAddParams', () => {
    const base = { action: 'life-tracker-quick-add' }

    test('no property and no action opens the panel', () => {
        expect(parseQuickAddParams(base)).toEqual({
            ok: true,
            request: { kind: 'open', date: null }
        })
    })

    test('a bare increment flag means one step', () => {
        const result = parseQuickAddParams({ ...base, property: 'water', increment: 'true' })
        expect(result).toEqual({
            ok: true,
            request: {
                kind: 'apply',
                property: 'water',
                action: { kind: 'increment', amount: null },
                date: null
            }
        })
    })

    test('reads an explicit amount, toggle and set', () => {
        const dec = parseQuickAddParams({ ...base, property: 'w', decrement: '2.5' })
        expect(dec.ok && dec.request.kind === 'apply' && dec.request.action).toEqual({
            kind: 'decrement',
            amount: 2.5
        })
        const toggle = parseQuickAddParams({ ...base, property: 'w', toggle: 'true' })
        expect(toggle.ok && toggle.request.kind === 'apply' && toggle.request.action).toEqual({
            kind: 'toggle'
        })
        const set = parseQuickAddParams({ ...base, property: 'w', set: 'mild' })
        expect(set.ok && set.request.kind === 'apply' && set.request.action).toEqual({
            kind: 'set',
            value: 'mild'
        })
    })

    test('parses the date as local midnight', () => {
        const result = parseQuickAddParams({ ...base, date: '2026-10-04' })
        expect(result.ok).toBe(true)
        const date = result.ok ? result.request.date : null
        expect(
            date && [date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]
        ).toEqual([2026, 9, 4, 0])
    })

    test('rejects malformed requests', () => {
        const errors: Array<Record<string, string>> = [
            { date: '2026-02-31' },
            { date: 'yesterday' },
            { increment: 'true' },
            { property: 'water' },
            { property: 'water', increment: 'true', toggle: 'true' },
            { property: 'water', increment: 'abc' },
            { property: 'water', increment: '-1' }
        ]
        for (const params of errors) {
            expect(parseQuickAddParams({ ...base, ...params }).ok).toBe(false)
        }
    })
})

describe('findQuickAddDefinition', () => {
    const defs = [
        makeDef({ id: 'a', name: 'water', displayName: 'Glasses of water' }),
        makeDef({ id: 'b', name: 'Water', displayName: '' }),
        makeDef({ id: 'c', name: 'mood', displayName: 'Mood' })
    ]

    test('prefers an exact name match', () => {
        expect(findQuickAddDefinition(defs, 'Water')?.id).toBe('b')
    })

    test('falls back to case-insensitive name or display name', () => {
        expect(findQuickAddDefinition(defs, 'MOOD')?.id).toBe('c')
        expect(findQuickAddDefinition(defs, 'glasses of water')?.id).toBe('a')
    })

    test('returns null when nothing matches', () => {
        expect(findQuickAddDefinition(defs, 'sleep')).toBeNull()
    })
})

describe('applyQuickAddAction', () => {
    const counter = makeDef({ type: 'number' })
    const mood = makeDef({ type: 'number', numberRange: { min: 1, max: 5, step: 1 } })
    const done = makeDef({ type: 'checkbox' })
    const text = makeDef({ type: 'text' })

    const apply = (def: PropertyDefinition, current: unknown, action: QuickAddAction) =>
        applyQuickAddAction(def, current, action)

    test('a bare increment steps like the + button', () => {
        expect(apply(counter, 4, { kind: 'increment', amount: null })).toEqual({
            ok: true,
            value: 5
        })
        expect(apply(counter, null, { kind: 'increment', amount: null })).toEqual({
            ok: true,
            value: 1
        })
        // From empty, a bounded property lands on its minimum
        expect(apply(mood, null, { kind: 'increment', amount: null })).toEqual({
            ok: true,
            value: 1
        })
    })

    test('an explicit amount adds to the current value and is clamped', () => {
        expect(apply(counter, '4', { kind: 'increment', amount: 0.25 })).toEqual({
            ok: true,
            value: 4.25
        })
        expect(apply(counter, null, { kind: 'decrement', amount: 2 })).toEqual({
            ok: true,
            value: -2
        })
        expect(apply(mood, 4, { kind: 'increment', amount: 3 })).toEqual({ ok: true, value: 5 })
    })

    test('toggle flips a checkbox, empty counting as false', () => {
        expect(apply(done, true, { kind: 'toggle' })).toEqual({ ok: true, value: false })
        expect(apply(done, null, { kind: 'toggle' })).toEqual({ ok: true, value: true })
    })

    test('set parses the value for the property type', () => {
        expect(apply(counter, 1, { kind: 'set', value: '7' })).toEqual({ ok: true, value: 7 })
        expect(apply(done, null, { kind: 'set', value: 'false' })).toEqual({
            ok: true,
            value: false
        })
        expect(apply(text, null, { kind: 'set', value: ' mild ' })).toEqual({
            ok: true,
            value: 'mild'
        })
    })

    test('rejects actions that do not fit the property type', () => {
        expect(apply(text, null, { kind: 'increment', amount: null }).ok).toBe(false)
        expect(apply(counter, null, { kind: 'toggle' }).ok).toBe(false)
        expect(apply(counter, null, { kind: 'set', value: 'abc' }).ok).toBe(false)
        expect(apply(done, null, { kind: 'set', value: 'maybe' }).ok).toBe(false)
        expect(apply(makeDef({ type: 'list' }), null, { kind: 'set', value: 'a' }).ok).toBe(false)
        // A bare `&set` flag carries no value
        expect(apply(text, null, { kind: 'set', value: 'true' }).ok).toBe(false)
    })
})
