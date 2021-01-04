// @flow

import {create, TypeRef} from "../../common/EntityFunctions"


export const EmailTemplateRefTypeRef: TypeRef<EmailTemplateRef> = new TypeRef("tutanota", "EmailTemplateRef")
export const _TypeModel: TypeModel = {
	"name": "EmailTemplateRef",
	"since": 45,
	"type": "AGGREGATED_TYPE",
	"id": 1167,
	"rootId": "CHR1dGFub3RhAASP",
	"versioned": false,
	"encrypted": false,
	"values": {
		"_id": {
			"name": "_id",
			"id": 1168,
			"since": 45,
			"type": "CustomId",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		}
	},
	"associations": {
		"list": {
			"name": "list",
			"id": 1169,
			"since": 45,
			"type": "LIST_ASSOCIATION",
			"cardinality": "One",
			"refType": "EmailTemplate",
			"final": true,
			"external": false
		}
	},
	"app": "tutanota",
	"version": "46"
}

export function createEmailTemplateRef(values?: $Shape<$Exact<EmailTemplateRef>>): EmailTemplateRef {
	return Object.assign(create(_TypeModel, EmailTemplateRefTypeRef), values)
}

export type EmailTemplateRef = {
	_type: TypeRef<EmailTemplateRef>;

	_id: Id;

	list: Id;
}