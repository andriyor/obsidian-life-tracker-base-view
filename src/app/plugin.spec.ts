import { describe, expect, test } from 'bun:test'
import { LifeTrackerPlugin } from './plugin'
import { createDefaultPropertyDefinition } from './types'
import type { PluginSettings, SettingsChangeInfo } from './types'
import type { LifeTrackerPluginSettingTab } from './settings/settings-tab'

const definition = (name: string) => ({ ...createDefaultPropertyDefinition(`id-${name}`, 0), name })

/** A plugin whose `data.json` is `disk.data`: loads read it, saves replace it */
async function createPlugin(initial: unknown) {
    const disk = { data: initial }
    const plugin = new LifeTrackerPlugin({} as never, {} as never)
    plugin.loadData = () => Promise.resolve(structuredClone(disk.data))
    plugin.saveData = (data: unknown) => {
        disk.data = structuredClone(data)
        return Promise.resolve()
    }
    await plugin.loadSettings()
    return { plugin, disk }
}

describe('onExternalSettingsChange', () => {
    test('a later save keeps the external change instead of overwriting it', async () => {
        const { plugin, disk } = await createPlugin({ propertyDefinitions: [definition('mood')] })

        disk.data = { propertyDefinitions: [definition('mood'), definition('sleep')] }
        await plugin.onExternalSettingsChange()
        await plugin.updateSettings((draft) => {
            draft.showConfettiOnCapture = false
        })

        const saved = disk.data as PluginSettings
        expect(saved.propertyDefinitions.map((d) => d.name)).toEqual(['mood', 'sleep'])
        expect(saved.showConfettiOnCapture).toBe(false)
    })

    test('notifies listeners with a full refresh', async () => {
        const { plugin } = await createPlugin({ propertyDefinitions: [definition('mood')] })
        const changes: SettingsChangeInfo[] = []
        plugin.onSettingsChange((_settings, info) => changes.push(info))

        await plugin.onExternalSettingsChange()

        expect(changes).toEqual([{ type: 'full' }])
    })

    test('refreshes an open settings tab with the reloaded values', async () => {
        const { plugin, disk } = await createPlugin({ propertyDefinitions: [definition('mood')] })
        const seen: string[][] = []
        plugin.settingTab = {
            refreshFromSettings: () =>
                seen.push(plugin.settings.propertyDefinitions.map((d) => d.name))
        } as unknown as LifeTrackerPluginSettingTab

        disk.data = { propertyDefinitions: [definition('mood'), definition('sleep')] }
        await plugin.onExternalSettingsChange()

        expect(seen).toEqual([['mood', 'sleep']])
    })

    test('an unreadable file keeps the current settings', async () => {
        const { plugin } = await createPlugin({ propertyDefinitions: [definition('mood')] })
        const changes: SettingsChangeInfo[] = []
        plugin.onSettingsChange((_settings, info) => changes.push(info))
        plugin.loadData = () => Promise.reject(new SyntaxError('Unexpected end of JSON input'))

        await plugin.onExternalSettingsChange()

        expect(plugin.settings.propertyDefinitions.map((d) => d.name)).toEqual(['mood'])
        expect(changes).toEqual([])
    })

    test('a missing file keeps the current settings, so a later save cannot wipe them', async () => {
        const { plugin, disk } = await createPlugin({ propertyDefinitions: [definition('mood')] })

        disk.data = null
        await plugin.onExternalSettingsChange()
        await plugin.updateSettings((draft) => {
            draft.showConfettiOnCapture = false
        })

        const saved = disk.data as PluginSettings | null
        expect(saved?.propertyDefinitions.map((d) => d.name)).toEqual(['mood'])
    })
})
