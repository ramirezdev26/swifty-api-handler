import { Counter, Histogram } from 'prom-client';

/**
 * Event Handler Duration - Duración de procesamiento por tipo de handler
 *
 * Labels:
 * - handler_name: Nombre del event handler (ImageUploadedEventHandler, etc.)
 */
export const eventHandlerDuration = new Histogram({
  name: 'swifty_api_handler_event_handler_duration_seconds',
  help: 'Duration of event handler processing in seconds',
  labelNames: ['handler_name'],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
});

/**
 * Event Handler Executions - Contador de ejecuciones de handlers
 *
 * Labels:
 * - handler_name: Nombre del handler
 * - status: success | error
 */
export const eventHandlerExecutions = new Counter({
  name: 'swifty_api_handler_event_handler_executions_total',
  help: 'Total number of event handler executions',
  labelNames: ['handler_name', 'status'],
});

/**
 * Event Handler Errors - Contador de errores por handler
 *
 * Labels:
 * - handler_name: Nombre del handler
 * - error_type: Tipo de error
 */
export const eventHandlerErrors = new Counter({
  name: 'swifty_api_handler_event_handler_errors_total',
  help: 'Total number of event handler errors',
  labelNames: ['handler_name', 'error_type'],
});
