// @flow
import o from "ospec/ospec.js"
import type {Template} from "../../../src/mail/TemplateModel"
import {searchForTag, searchInContent} from "../../../src/mail/TemplateSearchFilter"

o.spec("TemplateSearchFilter", function () {
	o("finds in title", function () {
		const template: Template = {
			_id: ["listId", "id"],
			title: "test title",
			tag: null,
			content: {},
			index: 0,
		}
		o(searchInContent("test", [template])).deepEquals([template])
	})
	o("finds in one content", function () {
		const template: Array<Template> = [
			{
				_id: ["listId", "id"],
				title: "test title",
				tag: null,
				content: {"en": "content"},
				index: 0,
			},
			{
				_id: ["listId", "id"],
				title: "test title",
				tag: null,
				content: {"de": "Inhalt"},
				index: 0,
			}
		]
		o(searchInContent("Inhalt", template)).deepEquals([template[1]])
	})
	o("finds in both content and one title", function () { // 2nd template should be found first
		const template: Array<Template> = [
			{
				_id: ["listId", "id"],
				title: "title",
				tag: null,
				content: {"en": "content test"},
				index: 0,
			},
			{
				_id: ["listId", "id"],
				title: "test title2",
				tag: null,
				content: {"de": "Inhalt test"},
				index: 0,
			}
		]
		o(searchInContent("test", template)).deepEquals([template[1], template[0]])
	})
	o("finds in tag", function () {
		const template: Template = {
			_id: ["listId", "id"],
			title: "title",
			tag: "test tag",
			content: {"en": "content"},
			index: 0
		}
		o(searchForTag("#test", [template])).deepEquals([template])
	})
	o.only("finds in multiple tag", function () {
		const template: Array<Template> = [
			{
				_id: ["listId", "id"],
				title: "title",
				tag: "matched tag",
				content: {"en": "content"},
				index: 0
			}, {
				_id: ["listId", "id"],
				title: "title",
				tag: "test tag match",
				content: {"en": "content"},
				index: 0
			}
		]
		o(searchForTag("#match", template)).deepEquals(template)
	})
	o("finds in content with multiple languages", function () {
		const template: Array<Template> = [
			{
				_id: ["listId", "id"],
				title: "title",
				tag: null,
				content: {"en": "match", "de": "match"},
				index: 0
			}, {
				_id: ["listId", "id"],
				title: "title2",
				tag: null,
				content: {"en": "match", "de": "match"},
				index: 0
			}
		]
		o(searchInContent("match", template)).deepEquals(template)
	})
	o.only("finds in content with multiple languages and in second title", function () {
		const template: Array<Template> = [
			{
				_id: ["listId", "id"],
				title: "title",
				tag: null,
				content: {"en": "match", "de": "match"},
				index: 0
			}, {
				_id: ["listId", "id"],
				title: "title2 match",
				tag: null,
				content: {"en": "match", "de": "match"},
				index: 0
			}
		]
		o(searchInContent("match", template)).deepEquals([template[1], template[0]]) // 2nd template should be found first
	})
})