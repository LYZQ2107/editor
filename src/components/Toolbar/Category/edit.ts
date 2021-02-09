import { App } from '@/App'
import { ToolbarCategory } from '../ToolbarCategory'

export function setupEditCategory(app: App) {
	const edit = new ToolbarCategory('mdi-pencil-outline', 'toolbar.edit.name')

	edit.addItem(
		app.actionManager.create({
			icon: 'mdi-content-copy',
			name: 'toolbar.edit.copy',
			description: 'Copy selected text to the clipboard',
			keyBinding: 'Ctrl + C',
			onTrigger: () => app.tabSystem.selectedTab?.copy(),
		})
	)
	edit.addItem(
		app.actionManager.create({
			icon: 'mdi-content-cut',
			name: 'toolbar.edit.cut',
			description:
				'Copy selected text to the clipboard and remove it from the original context',
			keyBinding: 'Ctrl + X',
			onTrigger: () => app.tabSystem.selectedTab?.cut(),
		})
	)
	edit.addItem(
		app.actionManager.create({
			icon: 'mdi-content-paste',
			name: 'toolbar.edit.paste',
			description: 'Paste clipboard content',
			keyBinding: 'Ctrl + V',
			onTrigger: () => app.tabSystem.selectedTab?.paste(),
		})
	)

	App.toolbar.addCategory(edit)
}
