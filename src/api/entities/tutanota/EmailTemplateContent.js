// @flow

import {create, TypeRef} from "../../common/EntityFunctions"


export const EmailTemplateContentTypeRef: TypeRef<EmailTemplateContent> = new TypeRef("tutanota", "EmailTemplateContent")
export const _TypeModel: TypeModel = {
	"name": "EmailTemplateContent",
	"since": 44,
	"type": "AGGREGATED_TYPE",
	"id": 1126,
	"rootId": "CHR1dGFub3RhAARm",
	"versioned": false,
	"encrypted": false,
	"values": {
		"_id": {
			"name": "_id",
			"id": 1127,
			"since": 44,
			"type": "CustomId",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		},
		"languageCode": {
			"name": "languageCode",
			"id": 1129,
			"since": 44,
			"type": "String",
			"cardinality": "One",
			"final": false,
			"encrypted": true
		},
		"text": {
			"name": "text",
			"id": 1128,
			"since": 44,
			"type": "String",
			"cardinality": "One",
			"final": false,
			"encrypted": true
		}
	},
	"associations": {},
	"app": "tutanota",
	"version": "45"
}

export function createEmailTemplateContent(values?: $Shape<$Exact<EmailTemplateContent>>): EmailTemplateContent {
	return Object.assign(create(_TypeModel, EmailTemplateContentTypeRef), values)
}

export type EmailTemplateContent = {
	_type: TypeRef<EmailTemplateContent>;

	_id: Id;
	languageCode: string;
	text: string;
}