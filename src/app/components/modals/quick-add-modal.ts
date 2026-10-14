import { Modal, Notice, setIcon, type TFile } from 'obsidian'
import type { LifeTrackerPlugin } from '../../plugin'
import type { PropertyDefinition, PropertyEditor } from '../../types'
import { FrontmatterService } from '../../services/frontmatter.service'
import { PropertyRecognitionService } from '../../services/property-recognition.service'
import { isShownInQuickAdd } from '../../services/quick-add.utils'
import { findDailyNote, offerToCreateDailyNote } from '../../commands/daily-note'
import { createPropertyEditor } from '../editing/property-editor'
import { AUTO_SAVE_DEBOUNCE_MS } from '../editing/editing.constants'
import { PropertyCaptureModal } from './property-capture-modal'
import { addDays, formatDateISO, isSameDay, log } from '../../../utils'

interface PendingSave {
    timerId: number
    definition: PropertyDefinition
}

/**
 * Quick-add panel (issue #122): every quick-add property of one day's note at
 * once, each editable in place and saved as it changes. No Next / Done: it is
 * for logging one or two values fast, the capture carousel stays the place
 * for a full check-in.
 */
export class QuickAddModal extends Modal {
    private readonly frontmatterService: FrontmatterService
    private readonly recognitionService: PropertyRecognitionService

    private date: Date
    private file: TFile | null = null
    private editors: PropertyEditor[] = []
    /** Latest value per property, updated on every editor change */
    private currentValues: Record<string, unknown> = {}
    private pendingSaves = new Map<string, PendingSave>()

    constructor(
        private readonly plugin: LifeTrackerPlugin,
        date: Date
    ) {
        super(plugin.app)
        this.date = date
        this.frontmatterService = new FrontmatterService(plugin.app)
        this.recognitionService = new PropertyRecognitionService(plugin.app)
    }

    override onOpen(): void {
        this.contentEl.addClass('lt-quick-add-modal')
        this.render()
    }

    override onClose(): void {
        this.teardown()
        this.contentEl.empty()
    }

    /** Flush typed edits still waiting on the debounce, then drop the editors */
    private teardown(): void {
        this.flushPendingSaves()
        for (const editor of this.editors) {
            editor.destroy()
        }
        this.editors = []
        this.currentValues = {}
    }

    private goToDay(date: Date): void {
        this.teardown()
        this.date = date
        this.render()
    }

    private render(): void {
        const { contentEl } = this
        contentEl.empty()

        this.file = findDailyNote(this.plugin, this.date)

        this.renderHeader(contentEl)

        const body = contentEl.createDiv({ cls: 'lt-quick-add-body' })
        if (!this.file) {
            this.renderMissingNote(body)
            return
        }

        const definitions = this.recognitionService
            .getApplicableProperties(this.file, this.plugin.settings.propertyDefinitions)
            .filter(isShownInQuickAdd)

        if (definitions.length === 0) {
            body.createDiv({
                cls: 'lt-quick-add-empty',
                text: 'No quick-add properties apply to this note. Turn on "Show in quick add" on a property in settings > Life Tracker > property definitions.'
            })
        } else {
            const values = this.frontmatterService.read(this.file)
            for (const definition of definitions) {
                this.renderRow(body, this.file, definition, values[definition.name])
            }
        }

        this.renderFooter(contentEl, this.file)
    }

    private renderHeader(container: HTMLElement): void {
        const header = container.createDiv({ cls: 'lt-quick-add-header' })

        const prevBtn = header.createEl('button', {
            cls: 'lt-carousel-file-nav-btn',
            attr: { 'aria-label': 'Previous day' }
        })
        setIcon(prevBtn, 'chevron-left')
        prevBtn.addEventListener('click', () => this.goToDay(addDays(this.date, -1)))

        const titleEl = header.createDiv({ cls: 'lt-quick-add-title' })
        titleEl.createSpan({
            cls: 'lt-quick-add-weekday',
            text: this.date.toLocaleDateString(undefined, { weekday: 'long' })
        })
        titleEl.createSpan({ cls: 'lt-quick-add-date', text: formatDateISO(this.date) })

        const nextBtn = header.createEl('button', {
            cls: 'lt-carousel-file-nav-btn',
            attr: { 'aria-label': 'Next day' }
        })
        setIcon(nextBtn, 'chevron-right')
        nextBtn.addEventListener('click', () => this.goToDay(addDays(this.date, 1)))

        if (!isSameDay(this.date, new Date())) {
            const todayBtn = header.createEl('button', {
                cls: 'lt-quick-add-today-btn',
                text: 'Today'
            })
            todayBtn.addEventListener('click', () => this.goToDay(new Date()))
        }
    }

    private renderMissingNote(container: HTMLElement): void {
        const empty = container.createDiv({ cls: 'lt-quick-add-empty' })
        empty.createDiv({ text: 'No note for this day.' })

        if (!this.plugin.settings.createMissingNotes) {
            empty.createDiv({
                cls: 'lt-quick-add-hint',
                text: 'Turn on "Create missing notes when capturing" in settings to create it from here.'
            })
            return
        }

        const createBtn = empty.createEl('button', { cls: 'mod-cta', text: 'Create note' })
        const date = this.date
        createBtn.addEventListener('click', () => {
            offerToCreateDailyNote(this.plugin, date, () => {
                // The user may have moved to another day while confirming
                if (isSameDay(this.date, date)) this.render()
            })
        })
    }

    private renderRow(
        container: HTMLElement,
        file: TFile,
        definition: PropertyDefinition,
        value: unknown
    ): void {
        const row = container.createDiv({ cls: 'lt-quick-add-row' })
        row.createDiv({
            cls: 'lt-quick-add-label',
            text: definition.displayName || definition.name
        })
        const editorEl = row.createDiv({ cls: 'lt-quick-add-editor' })

        this.currentValues[definition.name] = value

        const editor = createPropertyEditor({
            definition,
            value,
            compact: false,
            onChange: (newValue) => {
                this.currentValues[definition.name] = newValue
                const valid = this.frontmatterService.validate(newValue, definition).valid
                row.toggleClass('lt-quick-add-row--invalid', !valid)
                this.debouncedSave(file, definition)
            },
            onCommit: () => {
                this.cancelPendingSave(definition.name)
                this.saveImmediate(file, definition)
            }
        })

        editor.render(editorEl)
        this.editors.push(editor)
    }

    private renderFooter(container: HTMLElement, file: TFile): void {
        const footer = container.createDiv({ cls: 'lt-quick-add-footer' })
        const captureBtn = footer.createEl('button', { text: 'Open full capture' })
        captureBtn.addEventListener('click', () => {
            this.close()
            new PropertyCaptureModal(this.plugin, { mode: 'single-note', file }).open()
        })
    }

    private debouncedSave(file: TFile, definition: PropertyDefinition): void {
        this.cancelPendingSave(definition.name)
        const timerId = window.setTimeout(() => {
            this.pendingSaves.delete(definition.name)
            this.saveImmediate(file, definition)
        }, AUTO_SAVE_DEBOUNCE_MS)
        this.pendingSaves.set(definition.name, { timerId, definition })
    }

    private cancelPendingSave(name: string): void {
        const pending = this.pendingSaves.get(name)
        if (pending) {
            window.clearTimeout(pending.timerId)
            this.pendingSaves.delete(name)
        }
    }

    /** Save edits still waiting on the debounce: typed values are never dropped */
    private flushPendingSaves(): void {
        if (!this.file) return
        const file = this.file
        for (const { timerId, definition } of this.pendingSaves.values()) {
            window.clearTimeout(timerId)
            this.saveImmediate(file, definition)
        }
        this.pendingSaves.clear()
    }

    /** Write the latest value of one property, skipping invalid values */
    private saveImmediate(file: TFile, definition: PropertyDefinition): void {
        const value = this.currentValues[definition.name]
        const validation = this.frontmatterService.validate(value, definition)
        if (!validation.valid) {
            log(`Skipping quick-add save for ${definition.name}: ${validation.error}`, 'debug')
            return
        }

        void this.frontmatterService
            .write(file, { [definition.name]: value })
            .catch((error: unknown) => {
                log('Failed to save frontmatter', 'error', error)
                new Notice(
                    `Failed to save "${definition.displayName || definition.name}" for ${file.basename} — your value was not persisted`
                )
            })
    }
}
