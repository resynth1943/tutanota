// @flow
import m from "mithril"
import {px} from "../gui/size"
import {knowledgebase} from "./KnowledgeBaseModel"
import {theme} from "../gui/theme"
import {Icons} from "../gui/base/icons/Icons"
import type {KnowledgeBaseEntry} from "../api/entities/tutanota/KnowledgeBaseEntry"
import {KnowledgeBaseListEntry} from "./KnowledgeBaseListEntry"
import {lang} from "../misc/LanguageViewModel"
import type {TextFieldAttrs} from "../gui/base/TextFieldN"
import {TextFieldN} from "../gui/base/TextFieldN"
import type {ButtonAttrs} from "../gui/base/ButtonN"
import {ButtonColors, ButtonN, ButtonType} from "../gui/base/ButtonN"
import stream from "mithril/stream/stream.js"
import {Dialog} from "../gui/base/Dialog"
import {DropDownSelectorN} from "../gui/base/DropDownSelectorN"
import {KnowledgeBaseEntryView} from "./KnowledgeBaseEntryView"
import {BootIcons} from "../gui/base/icons/BootIcons"
import {locator} from "../api/main/MainLocator"
import {KnowledgeBaseEditor} from "../settings/KnowledgeBaseEditor"
import {lastThrow} from "../api/common/utils/ArrayUtils"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {KnowledgeBaseTemplateView} from "./KnowledgeBaseTemplateView"
import type {KnowledgeBaseStep} from "../api/entities/tutanota/KnowledgeBaseStep"
import type {LanguageCode} from "../misc/LanguageViewModel"
import {getListId, isSameId} from "../api/common/EntityFunctions"
import {assertNotNull, neverNull} from "../api/common/utils/Utils"
import {DialogHeaderBar} from "../gui/base/DialogHeaderBar"

type KnowledgebaseViewAttrs = {
	onSubmit: (string) => void
}

export const KNOWLEDGEBASE_PANEL_HEIGHT = 840;
export const KNOWLEDGEBASE_PANEL_WIDTH = 500;//575;

type TemplatePage = {
	type: "template",
	template: IdTuple,
	step: KnowledgeBaseStep,
	language: LanguageCode,
	fetchedTemplate: ?EmailTemplate
}

export type Page =
	| {type: "list"}
	| {type: "entry", entry: IdTuple}
	| TemplatePage

/**
 *  Renders the SearchBar and the list of knowledgebase entries besides the MailEditor
 */

export class KnowledgeBaseView implements MComponent<KnowledgebaseViewAttrs> {
	_searchbarValue: Stream<string>
	_selectedKeyword: Stream<string>
	_selectedEntryStream: Stream<?KnowledgeBaseEntry>
	_pages: Stream<Array<Page>>;

	constructor() {
		this._selectedKeyword = stream("")
		this._searchbarValue = stream("")
		knowledgebase.initAllKeywords()
		this._pages = stream([{type: "list"}])
		// Cache selected entry to not search for it in array every time but still get up-to-date value when model changes
		this._selectedEntryStream = stream.combine((pages, entries) => {
			m.redraw()
			const entryPage = pages().find(p => p.type === "entry")
			if (entryPage) {
				const entryId = entryPage.entry
				return entries().find((e) => isSameId(e._id, entryId))
			} else {
				return null
			}
		}, [this._pages, knowledgebase.getDisplayedEntries()])
	}

	view({attrs}: Vnode<KnowledgebaseViewAttrs>): Children {
		return m(".flex.flex-column.abs.elevated-bg", {
			style: {
				height: px(KNOWLEDGEBASE_PANEL_HEIGHT),
				width: px(KNOWLEDGEBASE_PANEL_WIDTH),
				top: px(120),
			}
		}, [this._renderHeader(attrs), m(".mr-s.ml-s", this._renderCurrentPageContent())])
	}

	_renderCurrentPageContent(): Children {
		const currentPage = lastThrow(this._pages())
		switch (currentPage.type) {
			case "list":
				return [this._renderSearchBar(), this._renderList()]
			case "entry":
				const entry = this._selectedEntryStream()
				if (!entry) return null
				return m(KnowledgeBaseEntryView, {
					entry: entry,
					onTemplateSelected: (template, step) => {
						const templatePage: TemplatePage = {
							type: "template",
							template,
							step,
							language: lang.code,
							fetchedTemplate: null
						}
						knowledgebase.loadTemplate(template).then((fetchedTemplate) => {
							templatePage.fetchedTemplate = fetchedTemplate
							templatePage.language = knowledgebase.getLanguageFromTemplate(fetchedTemplate)
							m.redraw()
						})
						this._pages(this._pages().concat(templatePage))
					},
					onEntryDeleted: (entry) => {
						Dialog.confirm("deleteEntryConfirm_msg").then((confirmed) => {
							if (confirmed) {
								locator.entityClient.erase(entry)
								       .then(() => this._removeLastPage())
							}
						})
					}
				})
			case "template":
				return m(KnowledgeBaseTemplateView, {
					step: currentPage.step,
					language: currentPage.language,
					onLanguageSelected: (language) => currentPage.language = language,
					fetchedTemplate: currentPage.fetchedTemplate
				})
			default:
				throw new Error("stub")
		}
	}

	_renderHeader(attrs: KnowledgebaseViewAttrs): Children {
		const currentPage = lastThrow(this._pages())
		switch (currentPage.type) {
			case "list":
				return renderHeaderBar(lang.get("knowledgebase_label"), () => {
					this._selectedEntryStream.end(true)
					knowledgebase.close()
				}, {
					label: "addEntry_label",
					click: () => {
						this._showDialogWindow()
					},
					type: ButtonType.Primary,
				})
			case "entry":
				const entry = this._selectedEntryStream()
				if (!entry) return null
				return renderHeaderBar(entry.title, () => {
					this._removeLastPage()
				}, {
					label: "edit_action",
					click: () => {
						new KnowledgeBaseEditor(entry, getListId(entry), neverNull(entry._ownerGroup), locator.entityClient)
					},
					type: ButtonType.Primary
				})
			case "template":
				const title = currentPage.fetchedTemplate ? currentPage.fetchedTemplate.title : lang.get("loading_msg")
				return renderHeaderBar(title, () => {
					this._removeLastPage()
				}, {
					label: "submit_label",
					click: () => {
						attrs.onSubmit(knowledgebase.getContentFromTemplate(currentPage.language, currentPage.fetchedTemplate))
						this._removeLastPage()
					},
					type: ButtonType.Primary
				})
			default:
				throw new Error("stub")

		}
	}

	_renderSearchBar(): Children {
		const addKeywordAttrs: ButtonAttrs = {
			label: "chooseFilterKeyword_label",
			click: () => {
				knowledgebase.initAllKeywords() // we need to call initAllKeywords here, because the knowledgebase isn't aware of any new entry and its keywords
				this._selectedKeyword(knowledgebase.getAllKeywords()[0])
				const submitKeywordAction = (dialog) => {
					knowledgebase.addFilterKeyword(this._selectedKeyword())
					knowledgebase.search(this._searchbarValue())
					dialog.close()
					m.redraw()
				}
				Dialog.showActionDialog({
					title: lang.get("chooseKeyword_action"),
					child: {
						view: () => m(DropDownSelectorN, {
							label: "chooseKeyword_action",
							items: knowledgebase.getAllKeywords().map(keyword => {
								return {
									name: keyword,
									value: keyword,
								}
							}),
							selectedValue: this._selectedKeyword
						})
					},
					allowOkWithReturn: true,
					okAction: submitKeywordAction
				})
			},
			type: ButtonType.Action,
			icon: () => BootIcons.Settings
		}

		const addEntryAttrs: ButtonAttrs = {
			label: "addEntry_label",
			click: () => {
				this._showDialogWindow()
			},
			type: ButtonType.Action,
			icon: () => Icons.Add
		}

		const searchBarAttrs: TextFieldAttrs = {
			label: "searchTitle_label",
			value: this._searchbarValue,
			injectionsRight: () => [
				m(ButtonN, addEntryAttrs), // TODO: Discuss
				knowledgebase.getAllEntries().length > 0 // only show "addFilterKeywords-Button" when entries exist
					? m(ButtonN, addKeywordAttrs)
					: null
			],
			oninput: (input) => {
				knowledgebase.search(input)
			}
		}

		return [
			m(TextFieldN, searchBarAttrs),
			m(".flex", {
				style: {
					height: px(50),
					overflowX: "scroll",
					overflowY: "hidden",
				}
			}, this._renderKeywords())
		]
	}

	_renderKeywords(): Children {
		return knowledgebase.getFilterKeywords().map(keyword => {
			return [
				m(".bubbleTag-no-padding.plr-button.pl-s.pr-s.border-radius.no-wrap.mr-s.min-content.click", {
					onclick: () => {
						knowledgebase.removeFromAddedKeyword(keyword)
						knowledgebase.search(this._searchbarValue())
						m.redraw()
					}
				}, keyword)
			]
		})
	}

	_renderList(): Children {
		return m(".scroll", [
			knowledgebase.containsResult()
				? knowledgebase.getDisplayedEntries()().map((entry, index) => this._renderListEntry(entry, index))
				: m(".center", lang.get("noEntryFound_label"))
		])
	}

	_renderListEntry(entry: KnowledgeBaseEntry, index: number): Children {
		return m(".flex.flex-column", [
			m(".flex.template-list-row.click", {
				style: {
					backgroundColor: (index % 2) ? theme.list_bg : theme.list_alternate_bg
				},
				onclick: () => {
					this._pages(this._pages().concat({type: "entry", entry: entry._id}))
				}
			}, [
				m(KnowledgeBaseListEntry, {entry: entry}),
			])
		])
	}

	_removeLastPage() {
		this._pages(this._pages().slice(0, -1))
	}

	_showDialogWindow() {
		locator.mailModel.getUserMailboxDetails().then(details => {
			if (details.mailbox.knowledgeBase && details.mailbox._ownerGroup) {
				new KnowledgeBaseEditor(null, details.mailbox.knowledgeBase.list, details.mailbox._ownerGroup, locator.entityClient)
			}
		})
	}
}

export function renderHeaderBar(title: string, click: () => void, rightButtonAttrs?: ButtonAttrs): Children {
	return m(".pr", m(DialogHeaderBar, { // padding right because otherwise the right button would be directly on the edge
		middle: () => title,
		left: [
			{
				label: "back_action",
				click,
				icon: () => Icons.ArrowBackward,
				colors: ButtonColors.DrawerNav,
				type: ButtonType.ActionLarge
			}
		],
		right: rightButtonAttrs
			? [rightButtonAttrs]
			: []
	}))

}

