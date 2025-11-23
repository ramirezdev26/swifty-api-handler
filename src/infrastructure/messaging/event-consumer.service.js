import rabbitmqService from '../services/rabbitmq.service.js';
import imageResultConsumer from '../consumers/image-result.consumer.js';

export class EventConsumerService {
  constructor() {
    this.imageResultConsumer = imageResultConsumer;
  }

  async start() {
    try {
      const channel = rabbitmqService.getChannel();

      const RESULT_EXCHANGE = 'image.results';
      const QUEUE_NAME = 'status_updates.handler';

      // Assert fanout exchange
      await channel.assertExchange(RESULT_EXCHANGE, 'fanout', { durable: true });

      // Assert queue for this consumer
      await channel.assertQueue(QUEUE_NAME, { durable: true });

      // Bind queue to exchange (receives ALL messages from exchange)
      await channel.bindQueue(QUEUE_NAME, RESULT_EXCHANGE, '');

      await channel.prefetch(1);

      console.log('[EventConsumer] Listening on', QUEUE_NAME);

      await channel.consume(
        QUEUE_NAME,
        async (msg) => {
          if (msg !== null) {
            try {
              const event = JSON.parse(msg.content.toString());
              await this.imageResultConsumer.handleEvent(event);
              channel.ack(msg);
            } catch (error) {
              console.error('[EventConsumer] Error processing event:', error);
              channel.nack(msg, false, false);
            }
          }
        },
        { noAck: false }
      );
    } catch (error) {
      console.error('[EventConsumer] Failed to start:', error);
      throw error;
    }
  }
}
