import { Queue } from '../types'
import { createCounterpartyWorker } from '../workers/createCounterpartyWorker'
import { queueWorker } from '../workers/queueWorker'

export const queueService = {
  init() {
    createCounterpartyWorker.init(Queue.CreateCounterparty)

    queueWorker(
      Queue.CreateCounterparty,
      createCounterpartyWorker.messageReceivedEvent
    )
  },
}
