import { amqpService } from '../services/amqp.service'

// @ts-ignore
export const queueWorker = (queueName, callbackEvent) => {
  amqpService
    .connect()
    .then((channel) => {
      amqpService.consumeFromQueue(channel, queueName, callbackEvent)
    })
    .catch((error) => {
      console.log(error)
    })
}
