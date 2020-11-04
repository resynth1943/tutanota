//@flow
import m from "mithril"
import {assertNotNull} from "../api/common/utils/Utils"
import type {Template} from "../settings/TemplateListView"

export type TemplateDisplayAttrs = {
	template: Template
}

export class TemplateDisplayer implements MComponent<TemplateDisplayAttrs> {
	_id: string

	view(vnode: Vnode<TemplateDisplayAttrs>): Children {
		const {title, content, id, index} = vnode.attrs.template
		this._id = assertNotNull(id)
		return m(".flex.flex-column", {style: {marginBottom: "3px", marginLeft: "8px", height: "auto", width: "100%"}}, [
			m(".flex.flex-column", [
				m("", {
					style: {
						fontSize: "18px",
						marginBottom: "-5px",
					}
				}, title.length <= 40 ? title : title.substring(0, 40) + "..."),
				m(".flex    ",  {style:{marginTop: "4px"}} , [
					id !== "" ? m(".b.teamLabel.pl-s.pr-s.border-radius.no-wrap.small.mr-s", {
						style: {
							fontSize: "12px",
							width: "min-content",
							height: "min-content",
						}
					}, "#" + this._id.toLowerCase()) : null,
					m("", {style: {fontSize: "14px", fontWeight: "bold"}}, index === 0 ? "" : index !== 1 ? index + " languages" : index  + " language")
				])

			]),
			// m("", {
			// 	style: {
			// 		fontSize: "14px",
			// 		marginLeft: "7px",
			// 		height: "40px",
			// 		overflow: "hidden"
			// 	}
			// }, m.trust(content.substring(0, 220) + "...")),
		],
		)
	}
}
