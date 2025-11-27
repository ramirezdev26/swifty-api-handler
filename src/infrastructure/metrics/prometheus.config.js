import { register, collectDefaultMetrics } from 'prom-client';

/**
 * Configuración centralizada de Prometheus para swifty-api-handler (Query Service)
 *
 * Colecta métricas default del sistema:
 * - Process CPU usage
 * - Process memory usage
 * - Node.js heap statistics
 * - Event loop lag
 * - Garbage collection metrics
 */
collectDefaultMetrics({
  prefix: 'swifty_api_handler_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  eventLoopMonitoringPrecision: 10,
});

/**
 * Registro central de métricas
 * Exportar para que el endpoint /metrics pueda consumirlo
 */
export { register };
