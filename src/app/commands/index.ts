import type { LifeTrackerPlugin } from '../plugin'
import { registerCaptureCommand } from './capture-command'
import { registerQuickAddCommand } from './quick-add-command'

/**
 * Register all plugin commands
 */
export function registerCommands(plugin: LifeTrackerPlugin): void {
    registerCaptureCommand(plugin)
    registerQuickAddCommand(plugin)
}
