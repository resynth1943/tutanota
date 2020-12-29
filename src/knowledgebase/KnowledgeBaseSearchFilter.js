// @flow

import type {KnowledgeBaseEntry} from "../api/entities/tutanota/KnowledgeBaseEntry"

export function knowledgeBaseSearch(text: string, allEntries: Array<KnowledgeBaseEntry>, filterKeywords: Array<string>): Array<KnowledgeBaseEntry> {
	let matchesKeywordQuery = [] // entries that match the keyword search
	let matchesKeywordAndTitleQuery = [] // entries that match the keyword and title search
	if (filterKeywords.length > 0) { // for no filter keywords we do not have to search -> else
		allEntries.forEach(entry => {
			if (hasAllFilterKeywords(entry, filterKeywords)) { // check for every entry if it has all filter keywords included
				matchesKeywordQuery.push(entry)
			}
		})
	} else {
		matchesKeywordQuery = allEntries
	}
	if (text) { // based on matched keywords search for title and push it to separate array
		matchesKeywordQuery.forEach(entry => {
			let entryTitle = entry.title.toLowerCase()
			if (entryTitle.includes(text)) {
				matchesKeywordAndTitleQuery.push(entry)
			}
		})
		return matchesKeywordAndTitleQuery
	} else { // if no text query is given, return entries that match the keyword search
		return matchesKeywordQuery
	}
}

function hasAllFilterKeywords(entry: KnowledgeBaseEntry, allFilterKeywords: Array<string>): boolean { // returns false if one keyword of the entry is not included in the filter keywords
	let foundKeywords = [] // Array for the found keywords of the entry
	for (const keyword of entry.keywords) { // iterate over all keywords of the entry and check if its included in the filter keywords
		if (allFilterKeywords.includes(keyword.keyword)) {
			foundKeywords.push(keyword.keyword)
		}
	}
	return (foundKeywords.length === allFilterKeywords.length)
}

/**
 *  keyword search has priority over text query search, as the list of available entries to be text-searched in has to be changed depending on prior keyword matches
 *  the search function has to cover 4 cases:
 *      - no input and no keywords
 *      - no input and keywords
 *      - input and no keywords
 *      - input and keywords
 *  if the two searches would be independent of each other, it would give double results because 2 of the 4 cases would be marked as correct,
 *  We have to limit either to the other to avoid that mistake.
 */
