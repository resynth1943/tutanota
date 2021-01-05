// @flow
import m from "mithril"
import type {KnowledgeBaseEntry} from "../api/entities/tutanota/KnowledgeBaseEntry"
import {px} from "../gui/size"
import {lang} from "../misc/LanguageViewModel"

export type KnowledgebaseListEntryAttrs = {
	entry: KnowledgeBaseEntry
}

export const KNOWLEDGEBASE_LIST_ENTRY_HEIGHT = 70

/**
 *  Renders one list entry of the knowledgebase
 */

export class KnowledgeBaseListEntry implements MComponent<KnowledgebaseListEntryAttrs> {
	view(vnode: Vnode<KnowledgebaseListEntryAttrs>): Children {
		const {title, keywords, steps} = vnode.attrs.entry
		return m(".ml-s.flex.flex-column.overflow-hidden.full-width", {
			style: {
				height: px(KNOWLEDGEBASE_LIST_ENTRY_HEIGHT),
			}
		}, [
			m(".text-ellipsis.mb-xs", title),
			m(".flex.badge-line-height.text-ellipsis", [
				keywords
					? keywords.map(keyword => {
						return m(".b.small.teamLabel.pl-s.pr-s.border-radius.no-wrap.small.mr-s", {
							style: {
								width: "min-content",
								height: "min-content"
							}
						}, keyword.keyword)
					})
					: null
			]),
			m(".mb-xs", lang.get("stepAmount_label", {"{steps}": steps.length}))
		])
	}
}