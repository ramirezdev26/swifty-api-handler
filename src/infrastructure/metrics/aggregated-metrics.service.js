import { totalImagesGauge, totalUsersGauge } from './business.metrics.js';
import { logger } from '../logger/pino.config.js';

/**
 * Servicio para actualizar métricas agregadas periódicamente
 *
 * Actualiza gauges que representan totales del sistema:
 * - Total de imágenes
 * - Total de usuarios
 */
export class AggregatedMetricsService {
  constructor(processedImageRepository, userProfileRepository) {
    this.processedImageRepository = processedImageRepository;
    this.userProfileRepository = userProfileRepository;
  }

  /**
   * Actualiza todas las métricas agregadas
   */
  async updateAggregatedMetrics() {
    try {
      // Total de imágenes
      const imageCount = await this.processedImageRepository.count();
      totalImagesGauge.set(imageCount);

      // Total de usuarios
      const userCount = await this.userProfileRepository.count();
      totalUsersGauge.set(userCount);

      logger.debug(
        {
          event: 'metrics.aggregated.updated',
          imageCount,
          userCount,
        },
        'Updated aggregated metrics'
      );
    } catch (error) {
      logger.error(
        {
          event: 'metrics.aggregated.failed',
          error: { message: error.message, type: error.constructor.name },
        },
        'Failed to update aggregated metrics'
      );
    }
  }

  /**
   * Inicia actualización periódica de métricas
   *
   * @param {number} intervalMs - Intervalo en milisegundos (default: 60000 = 1 minuto)
   */
  startPeriodicUpdate(intervalMs = 60000) {
    // Update inmediato
    this.updateAggregatedMetrics();

    // Update periódico
    setInterval(() => this.updateAggregatedMetrics(), intervalMs);

    logger.info(
      {
        event: 'metrics.aggregated.started',
        intervalMs,
      },
      `Started periodic aggregated metrics update every ${intervalMs}ms`
    );
  }
}
