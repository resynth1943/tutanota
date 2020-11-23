//@flow
import m from "mithril"
import type {Template} from "../settings/TemplateListView"
import {lang} from "../misc/LanguageViewModel"

export type TemplateResultRowAttrs = {
	template: Template
}

export class TemplatePopupResultRow implements MComponent<TemplateResultRowAttrs> {


	view(vnode: Vnode<TemplateResultRowAttrs>): Children {
		const {title, content, tag} = vnode.attrs.template
		const languageCount = Object.keys(content).length
		return m(".flex.flex-column", {
			style: {
				marginLeft: "8px",
				height: "47.7167px",
				width: "100%",
			}
		}, [
			m(".text-ellipsis", title),
			m(".flex.badge-line-height", [
				tag ? m(".b.small.teamLabel.pl-s.pr-s.border-radius.no-wrap.small.mr-s", {
					style: {
						width: "min-content",
						height: "min-content",
					}
				}, "#" + tag.toLowerCase()) : null,
				languageCount > 1
					? m(".smaller", {
						style: {
							marginLeft: "auto",
							marginRight: "0px",
							marginTop: "-7px"
						}
					}, lang.get("languagePluralCount_label", {"{count}": languageCount}))
					: m(".smaller", {
						style: {
							marginLeft: "auto",
							marginRight: "0px",
							marginTop: "-7px"
						}
					}, lang.get("languageSingularCount_label", {"{count}": languageCount}))
			]),
		])
	}
}

