import { Notice, type TFile } from 'obsidian'
import type { LifeTrackerPlugin } from '../plugin'
import { TimeGranularity, type StarterKitNoteType } from '../types'
import { ConfirmModal } from '../components/modals/confirm-modal'
import { NoteCreationService } from '../services/note-creation.service'
import { NoteTargetService } from '../services/note-target.service'
import { StarterKitService } from '../services/starter-kit.service'
import { formatDateISO, isSameDay, isTargetDiscoverable, parseDateFromPath } from '../../utils'
import { formatMomentPattern } from '../../utils/moment.utils'

/**
 * Find the daily note for a date: a markdown file whose path resolves to that
 * date at daily granularity — either a built-in pattern (YYYY-MM-DD) or one of
 * the user's custom filename date patterns (issue #139).
 *
 * Notes matched by a configured pattern beat notes that only matched a
 * built-in one: a user who wrote `daily/{{date}}` told us where their daily
 * notes live, so an identically named note in another folder must not win just
 * because it was touched more recently (issue #152). Ties inside the same
 * group are broken by modification time, freshest first.
 */
export function findDailyNote(plugin: LifeTrackerPlugin, date: Date): TFile | null {
    const candidates: Array<{ file: TFile; fromCustomPattern: boolean }> = []

    for (const file of plugin.app.vault.getMarkdownFiles()) {
        const parsed = parseDateFromPath(file.path)
        if (
            parsed !== null &&
            parsed.granularity === TimeGranularity.Daily &&
            isSameDay(parsed.date, date)
        ) {
            candidates.push({ file, fromCustomPattern: parsed.origin === 'custom' })
        }
    }

    candidates.sort((a, b) => {
        if (a.fromCustomPattern !== b.fromCustomPattern) {
            return a.fromCustomPattern ? -1 : 1
        }
        return b.file.stat.mtime - a.file.stat.mtime
    })

    return candidates[0]?.file ?? null
}

/** "today" for today, the ISO date otherwise — for notices and titles */
function describeDay(date: Date): string {
    return isSameDay(date, new Date()) ? 'today' : formatDateISO(date)
}

/**
 * Offer to create the daily note for a date when the vault has none (issue
 * #160), then hand the new file to `onReady`.
 *
 * Creation is opt-in and confirmed: this writes a new file into the user's
 * vault, and the path comes from another plugin's configuration, so the user
 * sees exactly where it will go before agreeing.
 */
export function offerToCreateDailyNote(
    plugin: LifeTrackerPlugin,
    date: Date,
    onReady: (file: TFile) => void
): void {
    const day = describeDay(date)
    const missingNoteMessage = `No note for ${day} found. Expected a note named after the date (YYYY-MM-DD), or matching one of your filename date patterns.`

    if (!plugin.settings.createMissingNotes) {
        new Notice(missingNoteMessage)
        return
    }

    const targetService = new NoteTargetService(plugin.app, formatMomentPattern)
    const noteType = findDailyNoteType(plugin)
    const resolution = targetService.resolve(date, TimeGranularity.Daily, noteType)

    if (!resolution) {
        new Notice(
            `${missingNoteMessage} Life Tracker could not work out where to create one — configure the Periodic Notes plugin, or pick a Starter Kit note type in settings > Life Tracker > creating missing notes.`
        )
        return
    }

    // A note whose filename this plugin cannot parse back is invisible in every
    // view and unreachable by this command — the very problem being fixed. The
    // configuration is the user's, so this warns rather than refuses.
    const discoverable = isTargetDiscoverable(resolution.target, date, TimeGranularity.Daily)
    const warning = discoverable
        ? ''
        : `\n\nHeads up: Life Tracker will not recognise this filename as the note for ${day}, so the note will not appear in your views. Add a matching pattern in settings > Life Tracker > filename date patterns.`

    new ConfirmModal(
        plugin.app,
        `No note exists for ${day}. Create it at ${resolution.target.path}?${warning}`,
        () => {
            void createThen(
                plugin,
                resolution.target.path,
                async () => {
                    const outcome = await new NoteCreationService(plugin.app).ensureNote(resolution)
                    return outcome?.path ?? null
                },
                onReady
            )
        },
        {
            title: day === 'today' ? "Create today's note" : `Create the note for ${day}`,
            confirmText: 'Create'
        }
    ).open()
}

/**
 * Run a creation and hand over whatever note it produced.
 *
 * The file is resolved from the vault after creation rather than carried out of
 * it: a template may have been applied in between, and the vault is the
 * freshest source.
 */
async function createThen(
    plugin: LifeTrackerPlugin,
    expectedPath: string,
    create: () => Promise<string | null>,
    onReady: (file: TFile) => void
): Promise<void> {
    const path = await create()
    if (!path) {
        new Notice(`Could not create ${expectedPath}`)
        return
    }

    const file = plugin.app.vault.getFileByPath(path)
    if (!file) {
        new Notice(`Created ${path}, but it could not be opened`)
        return
    }

    onReady(file)
}

/**
 * The Starter Kit note type the user mapped to daily notes, or null.
 *
 * Null whenever the Starter Kit is unavailable or nothing is mapped, which
 * simply lets the resolver fall through to Periodic Notes.
 */
function findDailyNoteType(plugin: LifeTrackerPlugin): StarterKitNoteType | null {
    const noteTypeId = plugin.settings.dailyNoteTypeId
    if (!noteTypeId) return null

    const noteTypes = new StarterKitService(plugin.app).listNoteTypes()
    return noteTypes.find((candidate) => candidate.id === noteTypeId) ?? null
}
