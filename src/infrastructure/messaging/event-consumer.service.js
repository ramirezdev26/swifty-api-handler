import rabbitmqService from '../services/rabbitmq.service.js';
import imageResultConsumer from '../consumers/image-result.consumer.js';
import { logger } from '../logger/pino.config.js';

export class EventConsumerService {
  constructor() {
    this.imageResultConsumer = imageResultConsumer;
  }

  async start() {
    try {
      logger.info(
        {
          event: 'event-consumer.start.initiated',
        },
        'Starting event consumer service'
      );

      const channel = rabbitmqService.getChannel();

      const RESULT_EXCHANGE = 'image.results';
      const QUEUE_NAME = 'status_updates.handler';

      // Assert fanout exchange
      await channel.assertExchange(RESULT_EXCHANGE, 'fanout', { durable: true });
      logger.debug(
        {
          event: 'rabbitmq.exchange.asserted',
          exchange: RESULT_EXCHANGE,
          type: 'fanout',
        },
        `Exchange ${RESULT_EXCHANGE} asserted`
      );

      // Assert queue for this consumer
      await channel.assertQueue(QUEUE_NAME, { durable: true });
      logger.debug(
        {
          event: 'rabbitmq.queue.asserted',
          queue: QUEUE_NAME,
        },
        `Queue ${QUEUE_NAME} asserted`
      );

      // Bind queue to exchange (receives ALL messages from exchange)
      await channel.bindQueue(QUEUE_NAME, RESULT_EXCHANGE, '');
      logger.debug(
        {
          event: 'rabbitmq.queue.bound',
          queue: QUEUE_NAME,
          exchange: RESULT_EXCHANGE,
        },
        `Queue ${QUEUE_NAME} bound to exchange ${RESULT_EXCHANGE}`
      );

      await channel.prefetch(1);

      logger.info(
        {
          event: 'event-consumer.listening',
          queue: QUEUE_NAME,
          exchange: RESULT_EXCHANGE,
        },
        `Event consumer listening on ${QUEUE_NAME}`
      );

      await channel.consume(
        QUEUE_NAME,
        async (msg) => {
          if (msg !== null) {
            const messageLogger = logger.child({
              messageId: msg.properties.messageId,
              correlationId: msg.properties.correlationId,
            });

            try {
              const event = JSON.parse(msg.content.toString());

              messageLogger.debug(
                {
                  event: 'rabbitmq.message.received',
                  routingKey: msg.fields.routingKey,
                  exchange: msg.fields.exchange,
                },
                'Message received from RabbitMQ'
              );

              await this.imageResultConsumer.handleEvent(event);
              channel.ack(msg);

              messageLogger.info(
                {
                  event: 'rabbitmq.message.acked',
                },
                'Message processed and acknowledged'
              );
            } catch (error) {
              messageLogger.error(
                {
                  event: 'rabbitmq.message.processing-failed',
                  error: {
                    type: error.constructor.name,
                    message: error.message,
                    stack: error.stack,
                  },
                },
                'Error processing event, message nacked'
              );
              channel.nack(msg, false, false);
            }
          }
        },
        { noAck: false }
      );

      logger.info(
        {
          event: 'event-consumer.start.completed',
        },
        'Event consumer service started successfully'
      );
    } catch (error) {
      logger.error(
        {
          event: 'event-consumer.start.failed',
          error: {
            type: error.constructor.name,
            message: error.message,
            stack: error.stack,
          },
        },
        'Failed to start event consumer service'
      );
      throw error;
    }
  }
}
