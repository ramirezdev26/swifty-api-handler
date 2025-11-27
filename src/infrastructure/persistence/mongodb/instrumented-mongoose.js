import mongoose from 'mongoose';
import {
  mongoQueryDuration,
  mongoQueriesTotal,
  mongoActiveConnections,
  mongoDocumentsReturned,
  mongoErrorsTotal,
} from '../../metrics/database.metrics.js';
import { logger } from '../../logger/pino.config.js';

/**
 * Configura hooks de Mongoose para colectar métricas de MongoDB
 *
 * Hooks implementados:
 * - pre: Antes de ejecutar query (marca inicio)
 * - post: Después de ejecutar query exitosa (registra métricas)
 * - error: En caso de error (registra error)
 */
export const setupMongooseMetrics = () => {
  // Hook: pre (antes de query)
  const preHook = function () {
    this._startTime = Date.now();
    mongoActiveConnections.inc();
  };

  // Hook: post (después de query exitoso)
  const postHook = function (docs) {
    if (!this._startTime) return;

    const duration = (Date.now() - this._startTime) / 1000;
    const operation = this.op; // find, findOne, update, etc.
    const collection = this.mongooseCollection?.collectionName || 'unknown';

    const labels = {
      operation,
      collection,
    };

    // Registrar duración
    mongoQueryDuration.observe(labels, duration);

    // Incrementar contador
    mongoQueriesTotal.inc({
      ...labels,
      status: 'success',
    });

    // Contar documentos retornados (solo para queries de lectura)
    if (docs && (operation === 'find' || operation === 'findOne')) {
      const count = Array.isArray(docs) ? docs.length : docs ? 1 : 0;
      mongoDocumentsReturned.observe({ collection }, count);
    }

    mongoActiveConnections.dec();

    // Log de query lenta (>50ms para MongoDB)
    if (duration > 0.05) {
      logger.warn(
        {
          event: 'mongodb.slow_query',
          duration: duration * 1000,
          operation,
          collection,
        },
        `Slow MongoDB query detected: ${duration * 1000}ms`
      );
    }
  };

  // Hook: error
  const errorHook = function (error) {
    if (!this._startTime) return;

    const operation = this.op;
    const collection = this.mongooseCollection?.collectionName || 'unknown';

    mongoErrorsTotal.inc({
      type: error.constructor.name,
      collection,
    });

    mongoQueriesTotal.inc({
      operation,
      collection,
      status: 'error',
    });

    mongoActiveConnections.dec();
  };

  // Aplicar hooks a todas las operaciones de lectura
  const readOperations = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'count',
    'countDocuments',
    'estimatedDocumentCount',
  ];

  mongoose.plugin((schema) => {
    readOperations.forEach((op) => {
      schema.pre(op, preHook);
      schema.post(op, postHook);
      schema.post(op, errorHook);
    });
  });

  // Métricas de conexión
  mongoose.connection.on('connected', () => {
    logger.info({ event: 'mongodb.connected' }, 'Connected to MongoDB');
    updateConnectionMetrics();
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn({ event: 'mongodb.disconnected' }, 'Disconnected from MongoDB');
    updateConnectionMetrics();
  });

  mongoose.connection.on('error', (error) => {
    logger.error(
      {
        event: 'mongodb.connection_error',
        error: { message: error.message },
      },
      'MongoDB connection error'
    );
    mongoErrorsTotal.inc({ type: 'ConnectionError', collection: 'connection' });
  });
};

/**
 * Actualiza métricas de estado de conexión
 */
function updateConnectionMetrics() {
  const state = mongoose.connection.readyState;
  mongoActiveConnections.set(state === 1 ? 1 : 0);
}
