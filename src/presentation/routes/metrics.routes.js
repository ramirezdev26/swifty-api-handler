import { Router } from 'express';
import { register } from '../../infrastructure/metrics/prometheus.config.js';

/**
 * Crea las rutas para exposición de métricas de Prometheus
 *
 * Endpoints:
 * - GET /metrics - Retorna todas las métricas en formato Prometheus
 */
export const createMetricsRoutes = () => {
  const router = Router();

  /**
   * GET /metrics
   *
   * Endpoint para que Prometheus scrapee las métricas
   * Content-Type: text/plain; version=0.0.4
   */
  router.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.send(metrics);
    } catch (error) {
      res.status(500).send('Error generating metrics');
    }
  });

  return router;
};
