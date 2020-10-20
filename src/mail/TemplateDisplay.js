import m from "mithril"

export type TemplateDisplayAttrs = {
	title: string;
	content: string;
	id: ?string;
}

export class TemplateDisplay implements MComponent<TemplateDisplayAttrs> {
	view(vnode: Vnode<TemplateDisplayAttrs>) {
		const {title, content, id} = vnode.attrs
		return m(".flex.flex-column", {style:{marginBottom:"3px", marginLeft: "8px", height: "90px"}},[
			m(".flex", [id !== null ? m(".b.teamLabel.pl-s.pr-s.border-radius.no-wrap.small.mr-s", {style:{fontSize: "12px", width: "min-content", height: "min-content", marginLeft: "5px", marginTop: "4px", marginRight: "-4px"}}, "#" + id.toLowerCase()) : null, m("", {style:{fontSize: "20px", marginBottom: "-5px", marginLeft: "8px"}} ,title)]),
			m("", {style:{fontSize: "14px", marginLeft: "7px", height: "40px"}} , content.substring(0, 220) + "..."),
			 // m(".flex", {style:{marginLeft: "12px"}}, tags.map(item => m(".b.teamLabel.pl-s.pr-s.border-radius.no-wrap.small.mr-s", {style:{fontSize: "10px", width: "min-content", marginLeft: "-4px"}}, item))),
		])
	}
}