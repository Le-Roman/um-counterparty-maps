import * as soap from 'soap'
import { stringToBase64 } from '../utils/stringToBase64'

let queue = ''

export const createCounterpartyWorker = {
  init(queueName: string) {
    queue = queueName
  },

  async messageReceivedEvent(message: string) {
    console.log(' [x] Worker ' + queue + ' has received message: ' + message)

    const client = await soap.createClientAsync(
      process.env.CREATE_COUNTERPARTY_NOTIFY_SOAP_URL as string,
      {
        wsdl_headers: {
          Authorization: `Basic ${stringToBase64(
            `${process.env.USERNAME_1C}:${process.env.PASSWORD_1C}`
          )}`,
        },
      }
    )
    console.log({client})
    client.setSecurity(
      new soap.BasicAuthSecurity(
        process.env.USERNAME_1C as string,
        process.env.PASSWORD_1C as string
      )
    )

    await client.CompetitorMapAsync({
      return: message,
    })
  },
}
