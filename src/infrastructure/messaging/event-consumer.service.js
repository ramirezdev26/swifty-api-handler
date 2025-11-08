export class EventConsumerService {
  constructor(rabbitmqConnection, eventHandlers) {
    this.connection = rabbitmqConnection;
    this.eventHandlers = eventHandlers;
    this.queueName = 'swifty.query-events';
    this.exchange = 'swifty.events';
  }

  async start() {
    const channel = await this.connection.getChannel();

    // Assert exchange (should already exist from command service)
    await channel.assertExchange(this.exchange, 'topic', { durable: true });

    // Assert queue
    await channel.assertQueue(this.queueName, {
      durable: true,
      arguments: {
        'x-message-ttl': 86400000, // 24 hours
        'x-max-length': 10000,
      },
    });

    // Bind to all relevant events
    await channel.bindQueue(this.queueName, this.exchange, 'user.*');
    await channel.bindQueue(this.queueName, this.exchange, 'image.*');

    // Set prefetch
    await channel.prefetch(1);

    // Start consuming
    channel.consume(this.queueName, async (msg) => {
      if (!msg) return;

      try {
        const event = JSON.parse(msg.content.toString());
        console.log(`[QueryService] Received: ${event.type}`);

        const handler = this.eventHandlers.get(event.type);
        if (handler) {
          await handler.handle(event);
          channel.ack(msg);
        } else {
          console.warn(`[QueryService] No handler for: ${event.type}`);
          channel.ack(msg); // Ack anyway to avoid requeue loop
        }
      } catch (error) {
        console.error('[QueryService] Error processing event:', error);
        // Requeue with delay
        setTimeout(() => {
          channel.nack(msg, false, true);
        }, 5000);
      }
    });

    console.log(`[QueryService] Listening on ${this.queueName}`);
  }
}
