//@flow
import m from "mithril"
import {TEMPLATE_LIST_ENTRY_HEIGHT} from "./TemplatePopup"
import {px} from "../gui/size"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"

export type TemplateResultRowAttrs = {
	template: EmailTemplate
}

/*
*   renders one entry of the list in the template popup
*/

export class TemplatePopupResultRow implements MComponent<TemplateResultRowAttrs> {
	view(vnode: Vnode<TemplateResultRowAttrs>): Children {
		const {title, tag} = vnode.attrs.template
		return m(".flex.flex-column.overflow-hidden", {
			style: {
				marginLeft: "8px",
				height: px(TEMPLATE_LIST_ENTRY_HEIGHT),
				width: "100%",
			}
		}, [
			m(".text-ellipsis", title),
			m(".flex.badge-line-height.text-ellipsis", [
				tag ? m(".b.small.teamLabel.pl-s.pr-s.border-radius.no-wrap.small.mr-s", {
					style: {
						width: "min-content",
						height: "min-content",
					}
				}, "#" + tag.toLowerCase()) : null,
			]),
		])
	}
}

