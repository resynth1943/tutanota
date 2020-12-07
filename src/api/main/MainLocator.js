//@flow
import type {WorkerClient} from "./WorkerClient"
import {EventController} from "./EventController"
import {EntropyCollector} from "./EntropyCollector"
import {SearchModel} from "../../search/SearchModel"
import {MailModel} from "../../mail/MailModel"
import {assertMainOrNode} from "../Env"
import {notifications} from "../../gui/Notifications"
import {logins} from "./LoginController"
import type {ContactModel} from "../../contacts/ContactModel"
import {ContactModelImpl} from "../../contacts/ContactModel"
import {EntityClient} from "../common/EntityClient"
import type {CalendarModel} from "../../calendar/CalendarModel"
import {CalendarModelImpl} from "../../calendar/CalendarModel"
import {defer} from "../common/utils/Utils"

assertMainOrNode()

export type MainLocatorType = {|
	eventController: EventController,
	entropyCollector: EntropyCollector,
	search: SearchModel,
	mailModel: MailModel;
	calendarModel: CalendarModel;
	init: (WorkerClient) => void;
	contactModel: ContactModel;
	entityClient: EntityClient;
	initializedWorker: Promise<WorkerClient>
|}

const workerDeferred = defer<WorkerClient>()

export const locator: MainLocatorType = ({
	initializedWorker: workerDeferred.promise,
	init(worker: WorkerClient) {
		this.eventController = new EventController(logins)
		this.entropyCollector = new EntropyCollector(worker)
		this.search = new SearchModel(worker)
		this.entityClient = new EntityClient(worker)
		this.mailModel = new MailModel(notifications, this.eventController, worker, this.entityClient)
		this.calendarModel = new CalendarModelImpl(notifications, this.eventController, worker, logins, this.entityClient, this.mailModel)
		this.contactModel = new ContactModelImpl(worker, this.entityClient, logins)
		workerDeferred.resolve(worker)
	},
}: any)

if (typeof window !== "undefined") {
	window.tutao.locator = locator
}