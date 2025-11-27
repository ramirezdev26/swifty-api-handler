import { Counter, Histogram, Gauge } from 'prom-client';

/**
 * Image Queries Total - Contador de consultas de imágenes
 *
 * Labels:
 * - filter_type: Tipo de filtro (by_user, by_style, all)
 * - status: success | error
 */
export const imageQueriesTotal = new Counter({
  name: 'swifty_api_handler_image_queries_total',
  help: 'Total number of image queries',
  labelNames: ['filter_type', 'status'],
});

/**
 * Images Returned - Histograma de cantidad de imágenes retornadas
 * Útil para identificar queries que retornan muchos resultados
 */
export const imagesReturned = new Histogram({
  name: 'swifty_api_handler_images_returned',
  help: 'Number of images returned per query',
  buckets: [0, 1, 5, 10, 25, 50, 100, 250],
});

/**
 * Cache Hit Rate - Gauge de cache hit ratio (para implementación futura)
 *
 * Labels:
 * - cache_type: Tipo de cache (redis, memory, etc.)
 *
 * Valor: Porcentaje 0-100
 */
export const cacheHitRate = new Gauge({
  name: 'swifty_api_handler_cache_hit_rate',
  help: 'Cache hit rate percentage',
  labelNames: ['cache_type'],
});

/**
 * Total Images in System - Gauge de total de imágenes en el read model
 * Actualizado periódicamente por AggregatedMetricsService
 */
export const totalImagesGauge = new Gauge({
  name: 'swifty_api_handler_total_images',
  help: 'Total number of images in the read model',
});

/**
 * Total Users in System - Gauge de total de usuarios en el read model
 * Actualizado periódicamente por AggregatedMetricsService
 */
export const totalUsersGauge = new Gauge({
  name: 'swifty_api_handler_total_users',
  help: 'Total number of users in the read model',
});
