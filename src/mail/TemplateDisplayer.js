//@flow
import m from "mithril"
import {assertNotNull} from "../api/common/utils/Utils"
import type {Template} from "../settings/TemplateListView"

export type TemplateDisplayAttrs = {
	template: Template
}

export class TemplateDisplayer implements MComponent<TemplateDisplayAttrs> {
	_id: string
	_length: number

	view(vnode: Vnode<TemplateDisplayAttrs>): Children {
		this._length = 0
		const {title, content, groupKey} = vnode.attrs.template
		Object.keys(content).map(() => {
			this._length++
		})
		this._id = assertNotNull(groupKey)
		return m(".flex.flex-column", {style: {marginBottom: "3px", marginLeft: "8px", height: "auto", width: "100%"}}, [
			m(".flex.flex-column", [
				m("", {
					style: {
						fontSize: "18px",
						marginBottom: "-5px",
					}
				}, title.length <= 40 ? title : title.substring(0, 40) + "..."),
				m(".flex    ",  {style:{marginTop: "4px"}} , [
					groupKey !== "" ? m(".b.teamLabel.pl-s.pr-s.border-radius.no-wrap.small.mr-s", {
						style: {
							fontSize: "12px",
							width: "min-content",
							height: "min-content",
						}
					}, "#" + this._id.toLowerCase()) : null,
					m("", {style: {fontSize: "14px", fontWeight: "bold"}}, this._length === 0 ? "" : this._length !== 1 ? this._length + " languages" : this._length  + " language")
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

