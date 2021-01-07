// @flow

import m from "mithril"
import {SettingsView} from "./SettingsView"
import {KnowledgeBaseEditor} from "./KnowledgeBaseEditor"
import {KnowledgeBaseDetailsViewer} from "./KnowledgeBaseDetailsViewer"
import type {KnowledgeBaseEntry} from "../api/entities/tutanota/KnowledgeBaseEntry"
import {KnowledgeBaseEntryTypeRef} from "../api/entities/tutanota/KnowledgeBaseEntry"
import {ButtonN, ButtonType} from "../gui/base/ButtonN"
import {locator} from "../api/main/MainLocator"
import {lang} from "../misc/LanguageViewModel"
import {List} from "../gui/base/List"
import type {EntityUpdateData} from "../api/main/EventController"
import {isUpdateForTypeRef} from "../api/main/EventController"
import {size} from "../gui/size"
import {assertMainOrNode} from "../api/Env"

assertMainOrNode()

/**
 *  List that is rendered within the knowledgebase Settings
 */

export class KnowledgeBaseListView implements UpdatableSettingsViewer {
	_list: List<KnowledgeBaseEntry, KnowledgeBaseRow>
	_settingsView: SettingsView

	constructor(settingsView: SettingsView) {
		this._settingsView = settingsView
		const entityClient = locator.entityClient

		locator.mailModel.getUserMailboxDetails().then(details => {
			if (details.mailbox.knowledgeBase) {
				const knowledgebaseListId = details.mailbox.knowledgeBase.list
				const listConfig: ListConfig<KnowledgeBaseEntry, KnowledgeBaseRow> = {
					rowHeight: size.list_row_height,
					fetch: (startId, count) => {
						console.log("Entries fetched", startId, count)
						return entityClient.loadRange(KnowledgeBaseEntryTypeRef, knowledgebaseListId, startId, count, true).then(entries => {
							console.log("Entries", entries)
							return entries
						})
					},
					loadSingle: (elementId) => {
						return entityClient.load(KnowledgeBaseEntryTypeRef, [knowledgebaseListId, elementId])
					},
					sortCompare: (a: KnowledgeBaseEntry, b: KnowledgeBaseEntry) => {
						var titleA = a.title.toUpperCase();
						var titleB = b.title.toUpperCase();
						return (titleA < titleB) ? -1 : (titleA > titleB) ? 1 : 0
					},
					elementSelected: (entries: Array<KnowledgeBaseEntry>, elementClicked) => {
						if (elementClicked) {
							this._settingsView.detailsViewer = new KnowledgeBaseDetailsViewer(entries[0], entityClient)
							this._settingsView.focusSettingsDetailsColumn()
						} else if (entries.length === 0 && this._settingsView.detailsViewer) {
							this._settingsView.detailsViewer = null
							m.redraw()
						}

					},
					createVirtualRow: () => {
						return new KnowledgeBaseRow()
					},
					showStatus: false,
					className: "knowledgeBase-list",
					swipe: {
						renderLeftSpacer: () => [],
						renderRightSpacer: () => [],
						swipeLeft: (listElement) => Promise.resolve(),
						swipeRight: (listElement) => Promise.resolve(),
						enabled: false
					},
					elementsDraggable: false,
					multiSelectionAllowed: false,
					emptyMessage: lang.get("noEntries_msg"),
				}
				this._list = new List(listConfig)
				this._list.loadInitial()
			}
		})
	}

	view(): Children {
		return m(".flex.flex-column.fill-absolute", [
			m(".flex.flex-column.justify-center.plr-l.list-border-right.list-bg.list-header",
				m(".mr-negative-s.align-self-end", m(ButtonN, {
					label: "addEntry_label",
					type: ButtonType.Primary,
					click: () => {
						this._showDialogWindow()
					}
				}))
			),
			m(".rel.flex-grow", m(this._list))
		])
	}

	_showDialogWindow() {
		locator.mailModel.getUserMailboxDetails().then(details => {
			if (details.mailbox.knowledgeBase && details.mailbox._ownerGroup) {
				new KnowledgeBaseEditor(null, details.mailbox.knowledgeBase.list, details.mailbox._ownerGroup, locator.entityClient)
			}
		})
	}

	entityEventsReceived(updates: $ReadOnlyArray<EntityUpdateData>): Promise<void> {
		console.log("event update received", updates)
		return Promise.each(updates, update => {
			if (isUpdateForTypeRef(KnowledgeBaseEntryTypeRef, update)) {
				return this._list.entityEventReceived(update.instanceId, update.operation)
			}
		}).then(() => {
			this._settingsView.detailsViewer = null
			m.redraw()
		})
	}
}

export class KnowledgeBaseRow {
	top: number;
	domElement: ?HTMLElement;
	entity: ?KnowledgeBaseEntry;
	_domEntryTitle: HTMLElement;

	constructor() {
		this.top = 0
	}

	update(entry: KnowledgeBaseEntry, selected: boolean): void {
		if (!this.domElement) {
			return
		}
		if (selected) {
			this.domElement.classList.add("row-selected")
		} else {
			this.domElement.classList.remove("row-selected")
		}
		this._domEntryTitle.textContent = entry.title
	}

	render(): Children {
		return [
			m(".top", [
				m(".name.text-ellipsis", {oncreate: (vnode) => this._domEntryTitle = vnode.dom}),
			]),
		]
	}
}