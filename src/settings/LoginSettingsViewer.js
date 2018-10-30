// @flow
import m from "mithril"
import {assertMainOrNode} from "../api/Env"
import {TextField} from "../gui/base/TextField"
import {lang} from "../misc/LanguageViewModel"
import {Button} from "../gui/base/Button"
import {PasswordForm} from "./PasswordForm"
import {logins} from "../api/main/LoginController"
import {ColumnWidth, Table} from "../gui/base/Table"
import {Icons} from "../gui/base/icons/Icons"
import TableLine from "../gui/base/TableLine"
import {SessionTypeRef} from "../api/entities/sys/Session"
import {neverNull} from "../api/common/utils/Utils"
import {erase, loadAll} from "../api/main/Entity"
import {formatDateTimeFromYesterdayOn} from "../misc/Formatter"
import {SessionState} from "../api/common/TutanotaConstants"
import {ExpanderButton, ExpanderPanel} from "../gui/base/Expander"
import {EditSecondFactorsForm} from "./EditSecondFactorsForm"
import {LazyLoaded} from "../api/common/utils/LazyLoaded"
import {isUpdateForTypeRef} from "../api/main/EntityEventController"
import {Dialog} from "../gui/base/Dialog"
import stream from "mithril/stream/stream.js"
import {ButtonN, ButtonType, createDropDown} from "../gui/base/ButtonN"
import {showProgressDialog} from "../gui/base/ProgressDialog"
import {AccessBlockedError, NotAuthenticatedError} from "../api/common/error/RestError"
import {worker} from "../api/main/WorkerClient"

assertMainOrNode()

export class LoginSettingsViewer implements UpdatableSettingsViewer {
	view: Function;
	_activeSessionTable: Table;
	_closedSessionTable: Table;
	_secondFactorsForm: EditSecondFactorsForm;

	constructor() {
		let mailAddress = new TextField("mailAddress_label").setValue(logins.getUserController().userGroupInfo.mailAddress)
		                                                    .setDisabled()
		let password = new TextField("password_label").setValue("***").setDisabled()
		let changePasswordButton = new Button("changePassword_label", () => PasswordForm.showChangeOwnPasswordDialog(), () => Icons.Edit)
		password._injectionsRight = () => [m(changePasswordButton)]

		let recoveryCodeField = new TextField("recoverCode_label").setValue("***").setDisabled()

		const showRecoveryCodeAttrs = {
			label: "showRecoveryCode_action",
			click: () => this._showRecoveryCodeDialog((password) => worker.getRecoveryCode(password)),
			type: ButtonType.Dropdown,
			isVisible: () => {
				const auth = logins.getUserController().user.auth
				return auth && auth.recoverCode
			}
		}
		const updateRecoveryCodeButton = {
			label: "updateRecoveryCode_action",
			click: () => this._showRecoveryCodeDialog((password) => worker.createRecoveryCode(password)),
			type: ButtonType.Dropdown
		}

		const recoveryDropdown = createDropDown(() => [showRecoveryCodeAttrs, updateRecoveryCodeButton], 300)

		recoveryCodeField._injectionsRight = () => m(ButtonN, {
			label: "edit_action",
			icon: () => Icons.Edit,
			click: recoveryDropdown
		})

		this._activeSessionTable = new Table([
			"client_label", "lastAccess_label", "IpAddress_label"
		], [ColumnWidth.Largest, ColumnWidth.Small, ColumnWidth.Small], true)
		this._closedSessionTable = new Table([
			"client_label", "lastAccess_label", "IpAddress_label"
		], [ColumnWidth.Largest, ColumnWidth.Small, ColumnWidth.Small], true)
		let closedSessionExpander = new ExpanderButton("show_action", new ExpanderPanel(this._closedSessionTable), false)

		this._secondFactorsForm = new EditSecondFactorsForm(new LazyLoaded(() => Promise.resolve(logins.getUserController().user)))

		this.view = () => {
			return [
				m("#user-settings.fill-absolute.scroll.plr-l.pb-xl", [
					m(".h4.mt-l", lang.get('loginCredentials_label')),
					m(mailAddress),
					m(password),
					m(recoveryCodeField),
					(!logins.getUserController().isOutlookAccount()) ?
						m(this._secondFactorsForm) : null,
					m(".h4.mt-l", lang.get('activeSessions_label')),
					m(this._activeSessionTable),
					m(".small", lang.get("sessionsInfo_msg")),
					m(".flex-space-between.items-center.mt-l.mb-s", [
						m(".h4", lang.get('closedSessions_label')),
						m(closedSessionExpander)
					]),
					m(closedSessionExpander.panel),
					m(".small", lang.get("sessionsInfo_msg")),
				])
			]
		}
		this._updateSessions()
	}

	_showRecoveryCodeDialog(action: (string) => Promise<Hex>) {
		const errorMessageStream = stream("")
		const dialog = Dialog.showRequestPasswordDialog((passwordField) => {
			showProgressDialog("loading_msg", action(passwordField.value()))
				.then((recoverCode) => {
					dialog.close()
					return Dialog.showRecoverCodeDialog(recoverCode)
				})
				.catch(NotAuthenticatedError, () => {
					errorMessageStream(lang.get("invalidPassword_msg"))
					passwordField.focus()
				})
				.catch(AccessBlockedError, () => {
					errorMessageStream(lang.get("tooManyAttempts_msg"))
					passwordField.focus()
				})
		}, errorMessageStream, () => { dialog.close()})
	}

	_updateSessions() {
		loadAll(SessionTypeRef, neverNull(logins.getUserController().user.auth).sessions).then(sessions => {
			sessions.sort((s1, s2) => s2.lastAccessTime.getTime() - s1.lastAccessTime.getTime())
			this._activeSessionTable.updateEntries(sessions
				.filter(session => session.state === SessionState.SESSION_STATE_ACTIVE)
				.map(session => {
					let closeSessionButton = null
					let thisSession = logins.getUserController().sessionId[1] === session._id[1]
					if (!thisSession) {
						closeSessionButton = new Button("closeSession_action", () => {
							erase(session)
						}, () => Icons.Cancel)
					}
					let identifier = (thisSession) ? lang.get("thisClient_label") : session.clientIdentifier
					return new TableLine([
						identifier,
						formatDateTimeFromYesterdayOn(session.lastAccessTime),
						(session.loginIpAddress) ? session.loginIpAddress : ""
					], closeSessionButton)
				}))
			this._closedSessionTable.updateEntries(sessions.filter(session => session.state
				!== SessionState.SESSION_STATE_ACTIVE).map(session => {
				return new TableLine([
					session.clientIdentifier,
					formatDateTimeFromYesterdayOn(session.lastAccessTime),
					(session.loginIpAddress) ? session.loginIpAddress : ""
				])
			}))
		})
	}

	entityEventsReceived(updates: $ReadOnlyArray<EntityUpdateData>) {
		for (let update of updates) {
			if (isUpdateForTypeRef(SessionTypeRef, update)) {
				this._updateSessions()
			}
			this._secondFactorsForm.entityEventReceived(update)
		}
	}
}
