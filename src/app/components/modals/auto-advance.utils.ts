/**
 * Auto-advance for the capture modal's property carousel: after a value is
 * picked from a closed set (dropdown option, emoji button, checkbox), move to
 * the next property without pressing Next.
 */

/** Pause before advancing, so the picked value is visible for a moment. */
export const AUTO_ADVANCE_DELAY_MS = 250

export interface AutoAdvanceState {
    /** The "Auto-advance after picking a value" setting */
    enabled: boolean
    /** The picked value */
    value: unknown
    /** Whether the picked property is the last one in the carousel */
    isLastProperty: boolean
}

/**
 * Whether a pick should move the carousel on.
 *
 * Never on the last property: advancing there means closing the modal or
 * jumping to the next file, which must stay an explicit action. Never for an
 * empty pick (the dropdown's "— Select" option): clearing a value is not an
 * answer to move past.
 */
export function shouldAutoAdvance(state: AutoAdvanceState): boolean {
    if (!state.enabled || state.isLastProperty) return false
    return state.value !== undefined && state.value !== null && state.value !== ''
}

/** Timer functions, injectable so the scheduler can be tested without a DOM. */
export interface AutoAdvanceTimers {
    setTimeout: (callback: () => void, delayMs: number) => number
    clearTimeout: (id: number) => void
}

/**
 * Holds at most one pending advance. A new schedule replaces the pending one,
 * and cancel drops it, so an advance never fires after the card it belongs to
 * is gone.
 */
export class AutoAdvanceScheduler {
    private timerId: number | null = null

    constructor(
        private readonly timers: AutoAdvanceTimers,
        private readonly delayMs: number = AUTO_ADVANCE_DELAY_MS
    ) {}

    schedule(advance: () => void): void {
        this.cancel()
        this.timerId = this.timers.setTimeout(() => {
            this.timerId = null
            advance()
        }, this.delayMs)
    }

    cancel(): void {
        if (this.timerId !== null) {
            this.timers.clearTimeout(this.timerId)
            this.timerId = null
        }
    }

    isPending(): boolean {
        return this.timerId !== null
    }
}
