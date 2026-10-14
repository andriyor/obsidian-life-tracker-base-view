import { describe, expect, test } from 'bun:test'
import {
    createDefaultPropertyDefinition,
    getPropertyPlaceholder
} from './property-definition.types'

const definition = (description: string) => ({
    ...createDefaultPropertyDefinition('id', 0),
    name: 'headache',
    displayName: 'Headache',
    description
})

describe('getPropertyPlaceholder', () => {
    test('uses a single-line description as is', () => {
        expect(getPropertyPlaceholder(definition('How bad was it?'))).toBe('How bad was it?')
    })

    test('joins the lines of a multi-line description instead of gluing them', () => {
        expect(getPropertyPlaceholder(definition('none — fine\r\nmild — dull\n\n  severe  '))).toBe(
            'none — fine · mild — dull · severe'
        )
    })

    test('falls back to the display label without a description', () => {
        expect(getPropertyPlaceholder(definition(''))).toBe('Headache')
        expect(getPropertyPlaceholder(definition(' \n '))).toBe('Headache')
    })

    test('falls back to the name without a display name', () => {
        expect(getPropertyPlaceholder({ ...definition(''), displayName: '' })).toBe('headache')
    })
})
