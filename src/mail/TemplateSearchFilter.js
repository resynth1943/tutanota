//@flow


export function searchForTag(input: string, list: any[]): Array<any> {
	let results = []
	let queryString = input.substring(1).trim().toLowerCase() // remove # and whitespaces at end from input
	list.forEach(template => {
			if (template.tag) {
				let templateTag = template.tag.toLowerCase()
				if (templateTag.includes(queryString)) {
					results.push(template)
				}
			}
		}
	)
	return results
}

export function searchInContent(input: string, list: any[]): Array<any> {                     // ~ + - * / \ ? & $ %
	let results = []
	let resultsContent = []
	let queryString = input.trim().toLowerCase()
	list.forEach(template => {
		if (template.title) {
			let templateTitle = template.title.toLowerCase()
			if (templateTitle.includes(queryString)) {
				results.push(template)
			}
		}
	})

	list.forEach(template => {
		for (const [lang, content] of Object.entries(template.content)) {
			if (String(content).toLowerCase().includes(queryString)) {
				if (!results.includes(template) && !resultsContent.includes(template)) {
					resultsContent.push(template)
				}
			}
		}
	})
	return results.concat(resultsContent)
}
