import { Histogram, Counter, Gauge } from 'prom-client';

/**
 * MongoDB Query Duration - Histograma de latencia de queries
 *
 * Labels:
 * - operation: Tipo de operación (find, findOne, aggregate, count, etc.)
 * - collection: Nombre de la colección
 */
export const mongoQueryDuration = new Histogram({
  name: 'swifty_api_handler_mongodb_query_duration_seconds',
  help: 'Duration of MongoDB queries in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
});

/**
 * MongoDB Queries Total - Contador de queries ejecutadas
 *
 * Labels:
 * - operation: Tipo de operación
 * - collection: Nombre de la colección
 * - status: success | error
 */
export const mongoQueriesTotal = new Counter({
  name: 'swifty_api_handler_mongodb_queries_total',
  help: 'Total number of MongoDB queries',
  labelNames: ['operation', 'collection', 'status'],
});

/**
 * MongoDB Active Connections - Gauge de conexiones activas
 * 1 = connected, 0 = disconnected
 */
export const mongoActiveConnections = new Gauge({
  name: 'swifty_api_handler_mongodb_active_connections',
  help: 'Number of active MongoDB connections',
});

/**
 * MongoDB Documents Returned - Histograma de cantidad de documentos retornados
 *
 * Labels:
 * - collection: Nombre de la colección
 */
export const mongoDocumentsReturned = new Histogram({
  name: 'swifty_api_handler_mongodb_documents_returned',
  help: 'Number of documents returned by MongoDB queries',
  labelNames: ['collection'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
});

/**
 * MongoDB Errors Total - Contador de errores de MongoDB
 *
 * Labels:
 * - type: Tipo de error (MongoNetworkError, ValidationError, etc.)
 * - collection: Nombre de la colección
 */
export const mongoErrorsTotal = new Counter({
  name: 'swifty_api_handler_mongodb_errors_total',
  help: 'Total number of MongoDB errors',
  labelNames: ['type', 'collection'],
});
