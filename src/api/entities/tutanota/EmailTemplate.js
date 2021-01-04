// @flow

import {create, TypeRef} from "../../common/EntityFunctions"

import type {EmailTemplateContent} from "./EmailTemplateContent"

export const EmailTemplateTypeRef: TypeRef<EmailTemplate> = new TypeRef("tutanota", "EmailTemplate")
export const _TypeModel: TypeModel = {
	"name": "EmailTemplate",
	"since": 45,
	"type": "LIST_ELEMENT_TYPE",
	"id": 1157,
	"rootId": "CHR1dGFub3RhAASF",
	"versioned": false,
	"encrypted": true,
	"values": {
		"_format": {
			"name": "_format",
			"id": 1161,
			"since": 45,
			"type": "Number",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		},
		"_id": {
			"name": "_id",
			"id": 1159,
			"since": 45,
			"type": "GeneratedId",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		},
		"_ownerEncSessionKey": {
			"name": "_ownerEncSessionKey",
			"id": 1163,
			"since": 45,
			"type": "Bytes",
			"cardinality": "ZeroOrOne",
			"final": true,
			"encrypted": false
		},
		"_ownerGroup": {
			"name": "_ownerGroup",
			"id": 1162,
			"since": 45,
			"type": "GeneratedId",
			"cardinality": "ZeroOrOne",
			"final": true,
			"encrypted": false
		},
		"_permissions": {
			"name": "_permissions",
			"id": 1160,
			"since": 45,
			"type": "GeneratedId",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		},
		"tag": {
			"name": "tag",
			"id": 1165,
			"since": 45,
			"type": "String",
			"cardinality": "One",
			"final": false,
			"encrypted": true
		},
		"title": {
			"name": "title",
			"id": 1164,
			"since": 45,
			"type": "String",
			"cardinality": "One",
			"final": false,
			"encrypted": true
		}
	},
	"associations": {
		"contents": {
			"name": "contents",
			"id": 1166,
			"since": 45,
			"type": "AGGREGATION",
			"cardinality": "Any",
			"refType": "EmailTemplateContent",
			"final": false
		}
	},
	"app": "tutanota",
	"version": "46"
}

export function createEmailTemplate(values?: $Shape<$Exact<EmailTemplate>>): EmailTemplate {
	return Object.assign(create(_TypeModel, EmailTemplateTypeRef), values)
}

export type EmailTemplate = {
	_type: TypeRef<EmailTemplate>;
	_errors: Object;

	_format: NumberString;
	_id: IdTuple;
	_ownerEncSessionKey: ?Uint8Array;
	_ownerGroup: ?Id;
	_permissions: Id;
	tag: string;
	title: string;

	contents: EmailTemplateContent[];
}