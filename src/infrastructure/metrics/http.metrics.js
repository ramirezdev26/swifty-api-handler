import { Histogram, Counter, Gauge } from 'prom-client';

/**
 * HTTP Request Duration - Histograma de latencia de QUERIES
 * Las queries deberían ser más rápidas que commands
 *
 * Labels:
 * - method: HTTP method (GET)
 * - route: Route pattern (normalized)
 * - status_code: HTTP status code
 */
export const httpRequestDuration = new Histogram({
  name: 'swifty_api_handler_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

/**
 * HTTP Requests Total - Contador de requests HTTP
 *
 * Labels:
 * - method: HTTP method
 * - route: Route pattern
 * - status_code: HTTP status code
 */
export const httpRequestsTotal = new Counter({
  name: 'swifty_api_handler_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

/**
 * HTTP Errors Total - Contador de errores HTTP
 *
 * Labels:
 * - type: Error type (ValidationError, NotFoundError, etc.)
 * - route: Route where error occurred
 */
export const httpErrorsTotal = new Counter({
  name: 'swifty_api_handler_http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['type', 'route'],
});

/**
 * HTTP Active Connections - Gauge de conexiones activas
 * Incrementa al inicio del request, decrementa al finalizar
 */
export const httpActiveConnections = new Gauge({
  name: 'swifty_api_handler_http_active_connections',
  help: 'Number of active HTTP connections',
});
