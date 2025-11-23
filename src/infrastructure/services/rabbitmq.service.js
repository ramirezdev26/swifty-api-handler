import amqp from 'amqplib';
import { config } from '../config/env.js';

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
      throw new Error('RABBITMQ_URL is not defined in environment variables');
    }

    for (let attempt = 1; attempt <= this.maxReconnectAttempts; attempt++) {
      try {
        this.connection = await amqp.connect(url);
        this.channel = await this.connection.createChannel();

        // For Query Service - just assert the exchange exists
        // (should be created by Command Service, but we assert to be safe)
        if (exchange) {
          await this.channel.assertExchange(exchange, 'topic', { durable: true });
          console.log(`[RabbitMQ] Exchange '${exchange}' ready`);
        }

        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log('[RabbitMQ] Connected successfully');

        this.connection.on('error', (err) => {
          console.error('[RabbitMQ] Connection error:', err);
          this.isConnected = false;
        });

        this.connection.on('close', () => {
          this.isConnected = false;
          console.log('[RabbitMQ] Connection closed');
        });

        return;
      } catch (error) {
        console.error(`[RabbitMQ] Connection attempt ${attempt} failed:`, error.message);
        this.reconnectAttempts = attempt;

        if (attempt < this.maxReconnectAttempts) {
          await new Promise((resolve) => setTimeout(resolve, this.reconnectDelay));
        } else {
          throw new Error('Failed to connect to RabbitMQ after maximum attempts');
        }
      }
    }
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
      console.log('RabbitMQ connection closed gracefully');
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
    }
  }
}

export default new RabbitMQService();
