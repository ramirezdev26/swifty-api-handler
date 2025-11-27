import { Gauge, Histogram } from 'prom-client';

/**
 * Read Model Lag - Lag entre command side y query side (CQRS)
 * Mide cuánto tiempo tarda un evento en materializarse en el read model
 *
 * Calcula la diferencia entre el timestamp del evento y cuando se procesa
 *
 * Labels:
 * - event_type: Tipo de evento
 */
export const readModelLag = new Histogram({
  name: 'swifty_api_handler_read_model_lag_seconds',
  help: 'Lag between command side event and query side materialization in seconds',
  labelNames: ['event_type'],
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
});

/**
 * Read Model Freshness - Timestamp del último evento procesado
 *
 * Labels:
 * - event_type: Tipo de evento
 *
 * Valor: Unix timestamp en segundos
 */
export const readModelFreshness = new Gauge({
  name: 'swifty_api_handler_read_model_freshness_timestamp',
  help: 'Timestamp of the last processed event (Unix timestamp)',
  labelNames: ['event_type'],
});

/**
 * Pending Events - Eventos pendientes de procesar
 *
 * Labels:
 * - event_type: Tipo de evento
 */
export const pendingEvents = new Gauge({
  name: 'swifty_api_handler_pending_events',
  help: 'Number of events pending to be processed',
  labelNames: ['event_type'],
});
