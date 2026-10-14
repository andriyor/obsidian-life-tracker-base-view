# Quick add (issue #122)

Status: implemented; needs manual verification in a live vault.

## Problem

Logging one value (a glass of water, a checkbox) goes through the capture
carousel: open the note, run the command, page to the property, tap, close.
Too slow for frequent tracking. A commenter also wants to back-fill the open
daily note rather than always today.

## Solution

Three entry points, one write path (`FrontmatterService`):

| Entry                                   | Target day                            | UI    |
| --------------------------------------- | ------------------------------------- | ----- |
| Command "Quick add"                     | open daily note's date, else today    | panel |
| Ribbon icon                             | same as the command                   | panel |
| `obsidian://life-tracker-quick-add?...` | `date` param, else today (never open) | none  |

- Panel (`QuickAddModal`): every quick-add property of one day's note, full-size
  editors reused from the grid card layout, saved as they change, debounced edits flushed
  on day change and close. ‹ › and Today switch days.
- Link: one action per link (`increment[=n]`, `decrement[=n]`, `toggle`,
  `set=<value>`), notice on success or refusal. Built for phone home-screen
  shortcuts: truly one tap.
- `showInQuickAdd` per property definition, opt-in (absent = hidden): a type
  default listed 71 properties in the reference vault. Life-Tracker-owned, so it
  survives Starter Kit syncs.
- −/+ from empty on a range starting at 0: + now gives one step instead of 0,
  which looked like a no-op on counters (live test finding).
- Daily note lookup and creation extracted from the Capture today command into
  `src/app/commands/daily-note.ts`, generalized from today to any date.

Pure logic (`src/app/services/quick-add.utils.ts`) is specced: visibility
default, panel day, link parsing, property lookup, action application.

## Not done

- Status bar widget: desktop only (Obsidian mobile has no status bar). Add if
  desktop users ask for it.

## Manual verification

- Panel opens on the open daily note's day, else today; ‹ › Today work.
- −/+, emoji and checkbox taps write immediately; a typed number is saved on
  close and on day change.
- Missing day: "Create note" goes through the confirmation, then the panel
  shows the new note.
- Links: `increment`, `increment=2`, `toggle`, `set=…`, `date=…`, unknown
  property, wrong type, out-of-range clamping, no property (opens panel), on
  desktop and from a phone shortcut.
