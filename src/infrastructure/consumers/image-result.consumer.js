import rabbitmqService from '../services/rabbitmq.service.js';
import { ProcessedImageRepository } from '../persistence/mongodb/repositories/processed-image.repository.js';
import { ProcessedImageModel } from '../persistence/mongodb/schemas/processed-image.schema.js';

class ImageResultConsumer {
  constructor() {
    this.imageRepository = new ProcessedImageRepository(ProcessedImageModel);
    this.isConsuming = false;
  }

  async start() {
    if (!rabbitmqService.isConnected) {
      throw new Error('RabbitMQ is not connected');
    }

    const channel = rabbitmqService.channel;
    await channel.prefetch(1);

    channel.consume(
      'status_updates',
      async (msg) => {
        if (msg !== null) {
          try {
            const event = JSON.parse(msg.content.toString());
            await this.handleEvent(event);
            channel.ack(msg);
          } catch (error) {
            console.error('Error processing status update:', error);
            channel.nack(msg, false, false);
          }
        }
      },
      { noAck: false }
    );

    this.isConsuming = true;
  }

  async handleEvent(event) {
    const { eventType, payload } = event;

    console.log(
      `[ImageResultConsumer] Event consumed - Type: ${eventType}, ImageId: ${payload.imageId}`
    );

    try {
      if (eventType === 'ImageProcessed') {
        // Upsert (create or update) in MongoDB
        await this.imageRepository.upsert({
          image_id: payload.imageId, // MongoDB schema uses image_id
          user_id: payload.userId,
          style: payload.style,
          status: 'processed',
          processed_url: payload.processedUrl,
          processing_time: payload.processingTime,
          processed_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(
          `[ImageResultConsumer] MongoDB upserted - ImageId: ${payload.imageId}, Status: processed, Time: ${payload.processingTime}ms`
        );
      } else if (eventType === 'ProcessingFailed') {
        // Upsert (create or update) in MongoDB
        await this.imageRepository.upsert({
          image_id: payload.imageId,
          user_id: payload.userId,
          status: 'failed',
          error_message: payload.error || 'Processing failed',
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(
          `[ImageResultConsumer] MongoDB upserted - ImageId: ${payload.imageId}, Status: failed, Error: ${payload.errorCode}`
        );
      } else {
        console.warn(`[ImageResultConsumer] Unknown event type: ${eventType}`);
      }
    } catch (error) {
      console.error('[ImageResultConsumer] Error updating MongoDB:', error);
      throw error; // Re-throw to trigger nack and retry
    }
  }

  async stop() {
    this.isConsuming = false;
  }
}

export default new ImageResultConsumer();
