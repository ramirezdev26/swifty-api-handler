import {
  httpRequestDuration,
  httpRequestsTotal,
  httpErrorsTotal,
  httpActiveConnections,
} from '../../infrastructure/metrics/http.metrics.js';

/**
 * Middleware para colectar métricas HTTP de requests
 * Mide latencia, cuenta requests, y trackea conexiones activas
 */
export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  httpActiveConnections.inc();

  const route = normalizeRoute(req.route?.path || req.path);

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      route: route,
      status_code: res.statusCode,
    };

    httpRequestDuration.observe(labels, duration);
    httpRequestsTotal.inc(labels);
    httpActiveConnections.dec();
  });

  next();
};

/**
 * Middleware para colectar métricas de errores HTTP
 * Debe registrarse DESPUÉS del error handler en Express
 */
export const errorMetricsMiddleware = (err, req, res, next) => {
  const route = normalizeRoute(req.route?.path || req.path);
  httpErrorsTotal.inc({
    type: err.constructor.name || 'Error',
    route: route,
  });
  next(err);
};

/**
 * Normaliza rutas para agrupar métricas correctamente
 * Convierte IDs dinámicos en placeholders
 *
 * Ejemplos:
 * - /api/images/550e8400-e29b-41d4-a716-446655440000 -> /api/images/:id
 * - /api/users/123 -> /api/users/:id
 * - /api/images?page=1&limit=10 -> /api/images
 */
function normalizeRoute(path) {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/[0-9]+/g, '/:id')
    .replace(/\?.*/g, '');
}
