/**
 * Tells a dropdown pick apart from keyboard browsing. On Windows, arrow keys
 * (and type-ahead) on a closed `<select>` change its value without opening it,
 * so every keystroke fires `change`. Only a change that follows a pointer
 * interaction is a pick; keyboard users confirm with Enter instead.
 */
export class SelectPickTracker {
    private keyboardActive = false

    /** A pointer (mouse, touch, pen) went down on the select. */
    onPointerDown(): void {
        this.keyboardActive = false
    }

    /** A key went down on the select. Enter is a confirmation, not browsing. */
    onKeyDown(key: string): void {
        if (key !== 'Enter') {
            this.keyboardActive = true
        }
    }

    /** Whether the `change` that just fired counts as a pick. */
    isPick(): boolean {
        return !this.keyboardActive
    }
}
