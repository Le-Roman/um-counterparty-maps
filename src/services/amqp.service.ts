import amqp from 'amqplib/callback_api'

export const amqpService = {
  connect() {
    return new Promise((resolve, reject) => {
      amqp.connect('amqp://localhost', (err0, conn) => {
        if (err0) {
          console.log(err0)
          reject(err0)
        }

        conn.createChannel((err1, channel) => {
          if (err1) {
            console.log(err1)
            reject(err1)
          }

          resolve(channel)
        })
      })
    })
  },

  // @ts-ignore
  sendMessageToQueue(channel, queueName, message) {
    try {
      channel.assertQueue(queueName, {
        durable: false,
      })

      channel.sendToQueue(queueName, Buffer.from(message))

      console.log(' [x] Sent %s', message)
    } catch (e) {
      console.log({ e })
    }
  },

  // @ts-ignore
  consumeFromQueue(channel, queueName, callback) {
    channel.assertQueue(queueName, {
      durable: false,
    })
    channel.prefetch(1)

    console.log(
      'Worker for queue ' + queueName + ' started! Listening for messages...'
    )

    channel.consume(
      queueName,
      // @ts-ignore
      async (message) => {
        try {
          await callback(message.content.toString())
          channel.ack(message)
        } catch (error) {
          channel.nack(message)
          console.error(error)
        }
      },
      {
        noAck: false,
      }
    )
  },
}
