import { Counter, Histogram, Gauge } from 'prom-client';

/**
 * RabbitMQ Messages Consumed - Contador de mensajes consumidos
 * Este servicio CONSUME eventos (no los publica como swifty-api)
 *
 * Labels:
 * - event_type: Tipo de evento (ImageUploaded, ImageProcessed, UserRegistered, etc.)
 * - status: success | error
 */
export const rabbitmqMessagesConsumed = new Counter({
  name: 'swifty_api_handler_rabbitmq_messages_consumed_total',
  help: 'Total number of messages consumed from RabbitMQ',
  labelNames: ['event_type', 'status'],
});

/**
 * RabbitMQ Event Processing Duration - Histograma de duración de procesamiento
 * Mide cuánto tarda en procesar un evento (incluyendo upsert en MongoDB)
 *
 * Labels:
 * - event_type: Tipo de evento
 */
export const rabbitmqEventProcessingDuration = new Histogram({
  name: 'swifty_api_handler_rabbitmq_event_processing_duration_seconds',
  help: 'Duration of RabbitMQ event processing in seconds',
  labelNames: ['event_type'],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

/**
 * RabbitMQ Queue Depth - Gauge de mensajes pendientes en cola
 *
 * Labels:
 * - queue_name: Nombre de la cola
 */
export const rabbitmqQueueDepth = new Gauge({
  name: 'swifty_api_handler_rabbitmq_queue_depth',
  help: 'Number of messages pending in RabbitMQ queue',
  labelNames: ['queue_name'],
});

/**
 * RabbitMQ Errors - Contador de errores de consumo
 *
 * Labels:
 * - error_type: Tipo de error
 * - event_type: Tipo de evento que causó el error
 */
export const rabbitmqErrorsTotal = new Counter({
  name: 'swifty_api_handler_rabbitmq_errors_total',
  help: 'Total number of RabbitMQ consumption errors',
  labelNames: ['error_type', 'event_type'],
});

/**
 * RabbitMQ Messages Requeued - Contador de mensajes reencolados
 *
 * Labels:
 * - event_type: Tipo de evento
 * - reason: Razón del requeue (retryable_error, sent_to_dlq)
 */
export const rabbitmqMessagesRequeued = new Counter({
  name: 'swifty_api_handler_rabbitmq_messages_requeued_total',
  help: 'Total number of messages requeued',
  labelNames: ['event_type', 'reason'],
});
