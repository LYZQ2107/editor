import { SidebarContent } from '/@/components/Sidebar/Content/SidebarContent'
import { SelectableSidebarAction } from '/@/components/Sidebar/Content/SelectableSidebarAction'
import { SidebarAction } from '../Sidebar/Content/SidebarAction'
import PackExplorerComponent from './PackExplorer.vue'
import { App } from '/@/App'
import { DirectoryEntry } from './DirectoryEntry'
import { InformationWindow } from '/@/components/Windows/Common/Information/InformationWindow'
import { ConfirmationWindow } from '/@/components/Windows/Common/Confirm/ConfirmWindow'
import { showContextMenu } from '../ContextMenu/showContextMenu'
import { set } from '@vue/composition-api'
import { InputWindow } from '../Windows/Common/Input/InputWindow'
import { dirname, extname, join } from '/@/utils/path'

export class PackExplorer extends SidebarContent {
	component = PackExplorerComponent
	actions: SidebarAction[] = []
	directoryEntries: Record<string, DirectoryEntry> = {}

	constructor() {
		super()

		App.eventSystem.on('projectChanged', () => {
			App.getApp().then(async (app) => {
				this.unselectAllActions()

				for (const pack of app.project.projectData.contains ?? []) {
					set(
						this.directoryEntries,
						pack.packPath,
						await DirectoryEntry.create([pack.packPath])
					)
				}

				this.actions =
					app.project.projectData.contains?.map(
						(pack) =>
							new SelectableSidebarAction(this, {
								id: pack.packPath,
								icon: pack.icon,
								color: pack.color,
							})
					) ?? []
				this.actions.push(
					new SidebarAction({
						icon: 'mdi-dots-vertical',
						onTrigger: (event) => {
							this.showMoreMenu(event)
						},
					})
				)
			})
		})

		App.eventSystem.on('fileAdded', () => this.refresh())
	}

	async refresh() {
		await Promise.all(
			Object.values(this.directoryEntries).map((dirent) =>
				dirent.refresh()
			)
		)
	}

	async getContextMenu(
		type: 'file' | 'folder' | 'virtualFolder',
		path: string,
		entry: DirectoryEntry
	) {
		if (type === 'virtualFolder') return []
		const project = await App.getApp().then((app) => app.project)

		return [
			{
				icon: 'mdi-delete-outline',
				name: 'windows.packExplorer.fileActions.delete.name',
				description:
					'windows.packExplorer.fileActions.delete.description',
				onTrigger: async () => {
					entry.remove()

					await Promise.all([
						project.packIndexer.unlink(path),
						project.compilerManager.unlink(path),
					])

					await project.jsonDefaults.reload()

					try {
						await project.fileSystem.unlink(path)
					} catch {}

					await project.recentFiles.removeFile(
						`projects/${project.name}/${path}`
					)
				},
			},
			// TODO
			// {
			// 	icon: 'mdi-pencil-outline',
			// 	name: 'windows.packExplorer.fileActions.rename.name',
			// description:
			// 'windows.packExplorer.fileActions.rename.description',
			// 	onTrigger: () => console.log('TODO'),
			// },
			type === 'file'
				? {
						icon: 'mdi-content-duplicate',
						name: 'windows.packExplorer.fileActions.duplicate.name',
						description:
							'windows.packExplorer.fileActions.duplicate.description',
						onTrigger: async () => {
							// Remove file extension from file name
							const fileName = entry.name
								.split('.')
								.slice(0, -1)
								.join('.')

							const inputWindow = new InputWindow({
								name:
									'windows.packExplorer.fileActions.duplicate.name',
								label:
									'windows.packExplorer.fileActions.duplicate.fileName',
								default: fileName,
								expandText: extname(path),
							})
							const newFileName = await inputWindow.fired
							if (!newFileName) return

							const newFilePath = join(dirname(path), newFileName)

							// If file with same path already exists, confirm that it's ok to overwrite it
							if (
								await project.fileSystem.fileExists(newFilePath)
							) {
								const confirmWindow = new ConfirmationWindow({
									description: 'general.confirmOverwriteFile',
								})

								if (!(await confirmWindow.fired)) return
							}

							await project.fileSystem.copyFile(path, newFilePath)
							await project.updateFile(newFilePath)
							this.refresh()
						},
				  }
				: null,
			{
				icon: 'mdi-folder-outline',
				name: 'windows.packExplorer.fileActions.revealFilePath.name',
				description:
					'windows.packExplorer.fileActions.revealFilePath.description',
				onTrigger: () =>
					new InformationWindow({
						name:
							'windows.packExplorer.fileActions.revealFilePath.name',
						description: `[${path}]`,
						isPersistent: false,
					}).open(),
			},
		]
	}

	async showMoreMenu(event: MouseEvent) {
		const app = await App.getApp()

		showContextMenu(event, [
			// Add new file
			{
				icon: 'mdi-plus',
				name: 'windows.packExplorer.createPreset',
				onTrigger: async () => {
					const app = await App.getApp()
					await app.windows.createPreset.open()
				},
			},
			// Reload project
			{
				icon: 'mdi-refresh',
				name: 'windows.packExplorer.refresh.name',
				onTrigger: async () => {
					app.actionManager.trigger('bridge.action.refreshProject')
				},
			},
			// Restart dev server
			{
				icon: 'mdi-restart-alert',
				name: 'windows.packExplorer.restartDevServer.name',
				onTrigger: () => {
					new ConfirmationWindow({
						description:
							'windows.packExplorer.restartDevServer.description',
						onConfirm: async () => {
							await Promise.all([
								app.project.fileSystem.unlink(
									'.bridge/.lightningCache'
								),
								app.project.fileSystem.unlink(
									'.bridge/.compilerFiles'
								),
							])
							await app.project.fileSystem.writeFile(
								'.bridge/.restartDevServer',
								''
							)

							app.actionManager.trigger(
								'bridge.action.refreshProject'
							)
						},
					})
				},
			},
		])
	}
}
