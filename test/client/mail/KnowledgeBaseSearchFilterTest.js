// @flow

import o from "ospec/ospec.js"
import {knowledgeBaseSearch} from "../../../src/knowledgebase/KnowledgeBaseSearchFilter.js"
import type {KnowledgeBaseEntry} from "../../../src/api/entities/tutanota/KnowledgeBaseEntry"
import {createKnowledgeBaseEntry} from "../../../src/api/entities/tutanota/KnowledgeBaseEntry"
import {createKnowledgeBaseEntryKeywords} from "../../../src/api/entities/tutanota/KnowledgeBaseEntryKeywords"
import {createKnowledgeBaseStep} from "../../../src/api/entities/tutanota/KnowledgeBaseStep"

o.spec("KnowledgeBaseSearchFilter", function () {
	o.only("finds in title with two filtered keywords", function () {
		const knowledgebaseEntry1: KnowledgeBaseEntry = createKnowledgeBaseEntry({
			title: "User forgot their password",
			useCase: "When a user is certain that they do not remember their password anymore",
			keywords: [
				createKnowledgeBaseEntryKeywords({keyword: "password"}),
				createKnowledgeBaseEntryKeywords({keyword: "forgotten"}),
				createKnowledgeBaseEntryKeywords({keyword: "reset"}),
				createKnowledgeBaseEntryKeywords({keyword: "account"}),
				createKnowledgeBaseEntryKeywords({keyword: "access"}),
			],
			steps: [
				createKnowledgeBaseStep({
					description: "first, ask the user if they tried all passwords that come to mind",
					stepNumber: "1",
					template: null
				}),
				createKnowledgeBaseStep({
					description: "if the user completed step 1, ask if they can provide proof that they own the account",
					stepNumber: "2",
					template: null
				})
			]
		})
		const knowledgebaseEntry2: KnowledgeBaseEntry = createKnowledgeBaseEntry({
			title: "User cannot access account anymore",
			useCase: "A general entry for when the user cannot access their account",
			keywords: [
				createKnowledgeBaseEntryKeywords({keyword: "access"}),
				createKnowledgeBaseEntryKeywords({keyword: "account"}),
				createKnowledgeBaseEntryKeywords({keyword: "lost"})
			],
			steps: [
				createKnowledgeBaseStep({
					description: "first, ask user whether its because of the password or other factors as to why they cannot access their account",
					stepNumber: "1",
					template: null
				})
			]
		})
		const allFakeEntries = [knowledgebaseEntry1, knowledgebaseEntry2]
		const filterKeywords = ["password", "forgotten"]
		o(knowledgeBaseSearch("password", allFakeEntries, filterKeywords)).deepEquals([knowledgebaseEntry1]) // should find knowledgebaseEntry1
	})
	o.only("finds in title without filtered keywords", function () {
		const knowledgebaseEntry1: KnowledgeBaseEntry = createKnowledgeBaseEntry({
			title: "User forgot their password",
			useCase: "When a user is certain that they do not remember their password anymore",
			keywords: [
				createKnowledgeBaseEntryKeywords({keyword: "password"}),
				createKnowledgeBaseEntryKeywords({keyword: "forgotten"}),
				createKnowledgeBaseEntryKeywords({keyword: "reset"}),
				createKnowledgeBaseEntryKeywords({keyword: "account"}),
				createKnowledgeBaseEntryKeywords({keyword: "access"}),
			],
			steps: [
				createKnowledgeBaseStep({
					description: "first, ask the user if they tried all passwords that come to mind",
					stepNumber: "1",
					template: null
				}),
				createKnowledgeBaseStep({
					description: "if the user completed step 1, ask if they can provide proof that they own the account",
					stepNumber: "2",
					template: null
				})
			]
		})
		const knowledgebaseEntry2: KnowledgeBaseEntry = createKnowledgeBaseEntry({
			title: "User cannot access account anymore",
			useCase: "A general entry for when the user cannot access their account",
			keywords: [
				createKnowledgeBaseEntryKeywords({keyword: "access"}),
				createKnowledgeBaseEntryKeywords({keyword: "account"}),
				createKnowledgeBaseEntryKeywords({keyword: "lost"})
			],
			steps: [
				createKnowledgeBaseStep({
					description: "ask user whether its because of the password or other factors as to why they cannot access their account",
					stepNumber: "1",
					template: null
				})
			]
		})
		const allFakeEntries = [knowledgebaseEntry1, knowledgebaseEntry2]
		const filterKeywords = []
		o(knowledgeBaseSearch("user", allFakeEntries, filterKeywords)).deepEquals([knowledgebaseEntry1, knowledgebaseEntry2]) // should find in both entries
	})
	o.only("finds entry only by filtered keywords", function () {
		const knowledgebaseEntry1: KnowledgeBaseEntry = createKnowledgeBaseEntry({
			title: "Payment has been booked but features arent accessible",
			useCase: "Something went wrong and the payment registered, but the user believes their features arent accessible yet",
			keywords: [
				createKnowledgeBaseEntryKeywords({keyword: "payment"}),
				createKnowledgeBaseEntryKeywords({keyword: "features"}),
				createKnowledgeBaseEntryKeywords({keyword: "inaccessible"}),
			],
			steps: [
				createKnowledgeBaseStep({
					description: "first, check how long the time between payment and contact has been",
					stepNumber: "1",
					template: null
				}),
				createKnowledgeBaseStep({
					description: "if it has been more than X days, ask the user to provide a bill or payment proof",
					stepNumber: "1",
					template: null
				})
			]
		})
		const knowledgebaseEntry2: KnowledgeBaseEntry = createKnowledgeBaseEntry({
			title: "Payment hasn't been booked yet, features aren't accessible either",
			useCase: "Something went wrong and the payment never registered",
			keywords: [
				createKnowledgeBaseEntryKeywords({keyword: "payment"}),
				createKnowledgeBaseEntryKeywords({keyword: "unregistered"}),
				createKnowledgeBaseEntryKeywords({keyword: "inaccessible"}),
				createKnowledgeBaseEntryKeywords({keyword: "features"})
			],
			steps: [
				createKnowledgeBaseStep({
					description: "ask user if they can provide a bill or payment proof",
					stepNumber: "1",
					template: null
				}),
				createKnowledgeBaseStep(({
					description: "if provided, re-do the booking and enable the features for the user",
					stepNumber: "2",
					template: null
				}))
			]
		})
		const knowledgebaseEntry3: KnowledgeBaseEntry = createKnowledgeBaseEntry({
			title: "Features don't work as intended, or are buggy",
			useCase: "The user has reported features that do not work as intended and hinder the users' experience",
			keywords: [
				createKnowledgeBaseEntryKeywords({keyword: "functionality"}),
				createKnowledgeBaseEntryKeywords({keyword: "not"}),
				createKnowledgeBaseEntryKeywords({keyword: "working"}),
				createKnowledgeBaseEntryKeywords({keyword: "bug"})
			],
			steps: [
				createKnowledgeBaseStep({
					description: "if needed, ask user if they can elaborate on their issue",
					stepNumber: "1",
					template: null
				}),
				createKnowledgeBaseStep({
					description: "if the problem is known, explain that the team is working on a fix, or explain a temporary fix",
					stepNumber: "2",
					template: null
				}),
				createKnowledgeBaseStep({
					description: "if its a new problem, tell the user that it has been reported to the team and will be taken care of",
					stepNumber: "3",
					template: null
				})
			]
		})
		const fakeEntries = [knowledgebaseEntry1, knowledgebaseEntry2, knowledgebaseEntry3]
		const filterKeywords = ["payment", "inaccessible"]
		o(knowledgeBaseSearch("", fakeEntries, filterKeywords)).deepEquals([knowledgebaseEntry1, knowledgebaseEntry2]) // should only find the first two entries, as the thirds keywords do not match the filtered search
	})
})