### Quick add: log a value in one tap

For the things you log many times a day (a glass of water, a set of calf raises,
a cup of coffee), opening the full capture dialog was too much friction.

- **Quick add panel**: run **Life Tracker: Quick add** or click the new ribbon
  icon. A small panel lists the properties you picked, each with its −/+ buttons,
  emoji buttons or checkbox. Every tap saves immediately.
- **Back-fill in place**: with a daily note open, the panel edits that day.
  Otherwise it edits today. Use ‹ › to move between days.
- **One-tap links**: `obsidian://life-tracker-quick-add?property=water&increment`
  adds one glass to today's note without opening anything. Put it on your
  phone's home screen (iOS Shortcuts, Android shortcut or widget). Links can
  also `decrement`, `toggle`, `set=<value>` and target a `date=YYYY-MM-DD`.
- **You choose what appears**: turn on **Show in quick add** for a property in
  settings. It is off by default, so the panel stays short.

### Faster capture

- **Auto-advance (optional)**: turn on **Auto-advance after picking a value**
  (Settings → Capture) and the capture dialog moves to the next property as soon
  as you pick from a dropdown, tap an emoji button or toggle a checkbox. Browsing
  a dropdown with the arrow keys does not count as a pick; press Enter instead.
  Thanks to Andrii Oriekhov for this one.
- **The first + on an empty counter now logs 1**: on a property whose range
  starts at 0, like water intake, the first tap used to log 0 and looked like
  nothing happened. **−** still sets 0, so "none today" stays one tap.

### Fixes

- **Missing values no longer chart as 0**: with a value mapping (e.g.
  `none → 0, mild → 1`), a day where the property was never filled in showed up
  as "none" on heatmaps and charts and pulled averages down. It now stays empty.
  Thanks to Andrii Oriekhov.
