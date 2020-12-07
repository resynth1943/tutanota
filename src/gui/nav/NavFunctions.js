//@flow

export function showUpgradeDialog() {
	import("../../subscription/UpgradeSubscriptionWizard.js")
		.then(upgradeWizard => upgradeWizard.showUpgradeWizard())
}

export function showSupportDialog() {
	import("../../support/SupportDialog.js")
		.then(supportModule => supportModule.showSupportDialog())
}

export function writeInviteMail() {
	import("../../mail/MailEditorN.js")
		.then(mailEditorModule => mailEditorModule.writeInviteMail())
}
