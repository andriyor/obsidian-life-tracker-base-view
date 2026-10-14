import { describe, expect, test } from 'bun:test'
import type { SettingDefinitionItem } from 'obsidian'
import { LifeTrackerPlugin } from '../plugin'
import { LifeTrackerPluginSettingTab } from './settings-tab'
import type { SectionPage } from './section-page'

/** A tab whose `update()` and open pages' `display()` only count calls */
function createTab() {
    const plugin = new LifeTrackerPlugin({} as never, {} as never)
    const tab = new LifeTrackerPluginSettingTab({} as never, plugin)
    const calls = { update: 0, draws: 0 }
    tab.update = () => {
        calls.update++
    }
    const openPage = (name: string): SectionPage => {
        const item = tab
            .getSettingDefinitions()
            .find(
                (entry: SettingDefinitionItem) =>
                    'type' in entry && entry.type === 'page' && entry.name === name
            )
        if (!item || !('page' in item) || typeof item.page !== 'function') {
            throw new Error(`No page named "${name}"`)
        }
        const page = item.page() as SectionPage
        page.display = () => {
            calls.draws++
        }
        return page
    }
    return { tab, calls, openPage }
}

describe('refreshFromSettings', () => {
    test('re-declares the tab', () => {
        const { tab, calls } = createTab()

        tab.refreshFromSettings()

        expect(calls).toEqual({ update: 1, draws: 0 })
    })

    test('redraws the open section page', () => {
        const { tab, calls, openPage } = createTab()
        openPage('Property definitions')

        tab.refreshFromSettings()

        expect(calls).toEqual({ update: 1, draws: 1 })
    })
})
