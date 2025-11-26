import amqp from 'amqplib';
import { config } from '../config/env.js';
import { logger } from '../logger/pino.config.js';

class RabbitMQService {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 5000;
  }

  getChannel() {
    return this.channel;
  }

  async connect() {
    const { url, exchange } = config.rabbitmq;
    if (!url) {
      logger.error(
        {
          event: 'rabbitmq.connection.config-error',
        },
        'RABBITMQ_URL is not defined in environment variables'
      );
      throw new Error('RABBITMQ_URL is not defined in environment variables');
    }

    logger.info(
      {
        event: 'rabbitmq.connection.started',
        url: url.replace(/:[^:@]+@/, ':****@'), // Mask password in logs
        exchange,
      },
      'Connecting to RabbitMQ...'
    );

    for (let attempt = 1; attempt <= this.maxReconnectAttempts; attempt++) {
      try {
        this.connection = await amqp.connect(url);
        this.channel = await this.connection.createChannel();

        // For Query Service - just assert the exchange exists
        // (should be created by Command Service, but we assert to be safe)
        if (exchange) {
          await this.channel.assertExchange(exchange, 'topic', { durable: true });
          logger.info(
            {
              event: 'rabbitmq.exchange.ready',
              exchange,
              type: 'topic',
            },
            `Exchange '${exchange}' ready`
          );
        }

        this.isConnected = true;
        this.reconnectAttempts = 0;

        logger.info(
          {
            event: 'rabbitmq.connection.success',
            exchange,
          },
          'Connected to RabbitMQ successfully'
        );

        this.connection.on('error', (err) => {
          logger.error(
            {
              event: 'rabbitmq.connection.error',
              error: {
                type: err.constructor.name,
                message: err.message,
              },
            },
            'RabbitMQ connection error'
          );
          this.isConnected = false;
        });

        this.connection.on('close', () => {
          this.isConnected = false;
          logger.warn(
            {
              event: 'rabbitmq.connection.closed',
            },
            'RabbitMQ connection closed'
          );
        });

        return;
      } catch (error) {
        logger.error(
          {
            event: 'rabbitmq.connection.attempt-failed',
            attempt,
            maxAttempts: this.maxReconnectAttempts,
            error: {
              type: error.constructor.name,
              message: error.message,
            },
          },
          `RabbitMQ connection attempt ${attempt} failed`
        );
        this.reconnectAttempts = attempt;

        if (attempt < this.maxReconnectAttempts) {
          logger.info(
            {
              event: 'rabbitmq.connection.retry',
              attempt: attempt + 1,
              delay: this.reconnectDelay,
            },
            `Retrying connection in ${this.reconnectDelay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, this.reconnectDelay));
        } else {
          logger.error(
            {
              event: 'rabbitmq.connection.failed',
              totalAttempts: this.maxReconnectAttempts,
            },
            'Failed to connect to RabbitMQ after maximum attempts'
          );
          throw new Error('Failed to connect to RabbitMQ after maximum attempts');
        }
      }
    }
  }

  async close() {
    try {
      logger.info(
        {
          event: 'rabbitmq.connection.closing',
        },
        'Closing RabbitMQ connection...'
      );

      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;

      logger.info(
        {
          event: 'rabbitmq.connection.closed-gracefully',
        },
        'RabbitMQ connection closed gracefully'
      );
    } catch (error) {
      logger.error(
        {
          event: 'rabbitmq.connection.close-error',
          error: {
            type: error.constructor.name,
            message: error.message,
            stack: error.stack,
          },
        },
        'Error closing RabbitMQ connection'
      );
    }
  }
}

export default new RabbitMQService();
