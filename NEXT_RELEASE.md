### Saturday as the first day of the week

**First day of the week** (Settings → Dates) now offers Saturday next to Monday
and Sunday. Weekly grouping, heatmap week columns and day labels, and "this
week" / "last week" ranges all follow it. ISO week labels (`2026-W42`) stay
Monday-based.

### Settings changed elsewhere are no longer overwritten

When `data.json` changed outside Obsidian (Obsidian Sync, a git pull, a hand
edit) while the plugin was running, the next settings change wrote the old
settings back and silently discarded the external change. The plugin now reloads
its settings when the file changes on disk, refreshes open views and an open
settings tab, and never writes during the reload. A file caught mid-write by a
sync tool, or briefly missing, is ignored instead of resetting your settings.
Thanks to Andrii Oriekhov.

### Multi-line property descriptions

A description written one line per value (`none — no headache`, `mild — …`) now
keeps its line breaks in the capture dialog instead of turning into one run-on
line. Used as an input's placeholder, its lines are joined with " · ". A
property without a description now shows its name as the placeholder. Thanks to
Andrii Oriekhov.
