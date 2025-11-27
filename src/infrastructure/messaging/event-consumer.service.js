import imageResultConsumer from '../consumers/image-result.consumer.js';
import { logger } from '../logger/pino.config.js';
import {
  rabbitmqMessagesConsumed,
  rabbitmqEventProcessingDuration,
  rabbitmqQueueDepth,
  rabbitmqErrorsTotal,
  rabbitmqMessagesRequeued,
} from '../metrics/rabbitmq.metrics.js';

export class EventConsumerService {
  constructor(rabbitmqService, eventHandlers) {
    this.rabbitmqService = rabbitmqService;
    this.eventHandlers = eventHandlers;
    this.imageResultConsumer = imageResultConsumer;
    this.queueName = 'status_updates.handler';
    this.channel = null;
  }

  /**
   * Actualiza métricas de queue depth periódicamente
   */
  async updateQueueMetrics() {
    try {
      if (!this.channel) return;
      const queueInfo = await this.channel.checkQueue(this.queueName);
      rabbitmqQueueDepth.set({ queue_name: this.queueName }, queueInfo.messageCount);
    } catch (error) {
      logger.error({ event: 'rabbitmq.queue_check.failed' }, 'Failed to check queue depth');
    }
  }

  async init() {
    try {
      logger.info(
        {
          event: 'event-consumer.start.initiated',
        },
        'Initializing Event Consumer Service...'
      );

      await this.rabbitmqService.connect();
      this.channel = this.rabbitmqService.getChannel();
      const channel = this.channel;

      const RESULT_EXCHANGE = 'image.results';
      const QUEUE_NAME = 'status_updates.handler';

      // Assert exchange
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

      // Start consuming messages
      await channel.consume(QUEUE_NAME, async (msg) => {
        if (msg !== null) {
          await this.handleMessage(msg, channel);
        }
      });

      // Actualizar métricas de queue cada 30 segundos
      setInterval(() => this.updateQueueMetrics(), 30000);

      logger.info(
        {
          event: 'event-consumer.start.completed',
        },
        'Event Consumer Service started successfully'
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
        'Failed to start Event Consumer Service'
      );
      throw error;
    }
  }

  async handleMessage(msg, channel) {
    const startTime = Date.now();
    const messageLogger = logger.child({
      messageId: msg.properties.messageId,
      correlationId: msg.properties.correlationId,
    });

    let eventType = 'unknown';

    try {
      const event = JSON.parse(msg.content.toString());
      eventType = event.eventType || event.type || event.status || 'unknown';

      messageLogger.debug(
        {
          event: 'rabbitmq.message.received',
          routingKey: msg.fields.routingKey,
          exchange: msg.fields.exchange,
          eventType,
        },
        'Message received from RabbitMQ'
      );

      // Process with the appropriate handler
      const handler = this.eventHandlers.get(eventType);
      if (handler) {
        await handler.handle(event);
        messageLogger.debug(
          {
            event: 'rabbitmq.message.handler.completed',
            eventType,
          },
          'Event handler completed successfully'
        );
      } else {
        // If no handler, process with imageResultConsumer
        await this.imageResultConsumer.handleEvent(event);
        messageLogger.debug(
          {
            event: 'rabbitmq.message.consumer.completed',
            eventType,
          },
          'Image result consumer completed successfully'
        );
      }

      // ACK message
      channel.ack(msg);

      // Métricas de éxito
      const duration = (Date.now() - startTime) / 1000;
      rabbitmqEventProcessingDuration.observe({ event_type: eventType }, duration);
      rabbitmqMessagesConsumed.inc({ event_type: eventType, status: 'success' });

      messageLogger.info(
        {
          event: 'rabbitmq.message.acked',
          eventType,
          duration,
        },
        'Message processed and acknowledged'
      );
    } catch (error) {
      // Métricas de error
      rabbitmqMessagesConsumed.inc({ event_type: eventType, status: 'error' });
      rabbitmqErrorsTotal.inc({
        error_type: error.constructor.name,
        event_type: eventType,
      });

      messageLogger.error(
        {
          event: 'rabbitmq.message.processing-failed',
          eventType,
          error: {
            type: error.constructor.name,
            message: error.message,
            stack: error.stack,
          },
        },
        'Error processing event, message nacked'
      );

      // Decidir si requeue o enviar a DLQ
      const shouldRequeue = !msg.fields.redelivered && error.retryable;

      if (shouldRequeue) {
        rabbitmqMessagesRequeued.inc({ event_type: eventType, reason: 'retryable_error' });
        channel.nack(msg, false, true); // Requeue
      } else {
        rabbitmqMessagesRequeued.inc({ event_type: eventType, reason: 'sent_to_dlq' });
        channel.nack(msg, false, false); // Send to DLQ
      }
    }
  }

  async close() {
    try {
      logger.info(
        {
          event: 'event-consumer.closing',
        },
        'Closing Event Consumer Service...'
      );

      if (this.channel) {
        await this.channel.close();
      }

      logger.info(
        {
          event: 'event-consumer.closed',
        },
        'Event Consumer Service closed successfully'
      );
    } catch (error) {
      logger.error(
        {
          event: 'event-consumer.close.failed',
          error: {
            type: error.constructor.name,
            message: error.message,
          },
        },
        'Error closing Event Consumer Service'
      );
    }
  }
}
