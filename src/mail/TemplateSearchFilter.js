//@flow
import type {Template} from "./TemplateModel"

export function searchForTag(input: string, list: Template[]): Array<Template> {
	let matchedTags = []
	let queryString = input.substring(1).trim().toLowerCase() // remove # and whitespaces at end from input
	list.forEach(template => {
			if (template.tag) {
				let templateTag = template.tag.toLowerCase()
				if (templateTag.includes(queryString)) {
					matchedTags.push(template)
				}
			}
		}
	)
	return matchedTags
}

export function searchInContent(input: string, list: Template[]): Array<Template> {
	let matchedTitles = []
	let matchedContents = []
	let queryString = input.trim().toLowerCase()
	list.forEach(template => {
		if (template.title) { // search in title
			let templateTitle = template.title.toLowerCase()
			if (templateTitle.includes(queryString)) {
				matchedTitles.push(template)
			}
		}
		for (const [lang, content] of Object.entries(template.content)) { // search in every language content of current template
			if (String(content).toLowerCase().includes(queryString)) {
				if (!matchedTitles.includes(template) && !matchedContents.includes(template)) { // only add if its not already found in title or in other language
					matchedContents.push(template)
				}
			}
		}
	})

	return matchedTitles.concat(matchedContents) // prioritize match in title over match in content
}