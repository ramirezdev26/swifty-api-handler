/**
 * HTTP Logger Middleware
 * Logs all HTTP requests and responses with structured data
 * Query Service - Only handles GET requests (read operations)
 */
export const httpLoggerMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Log incoming request
  req.logger.info(
    {
      event: 'http.request.started',
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      params: req.params,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
    `HTTP ${req.method} ${req.path}`
  );

  // Capture the original end function
  const originalEnd = res.end;

  // Override res.end to log response
  res.end = function (chunk, encoding) {
    // Restore original end function
    res.end = originalEnd;

    // Calculate duration
    const duration = Date.now() - startTime;

    // Determine log level based on status code
    const statusCode = res.statusCode;
    let logLevel = 'info';

    if (statusCode >= 500) {
      logLevel = 'error';
    } else if (statusCode >= 400) {
      logLevel = 'warn';
    } else if (duration > 1000) {
      // Slow query warning
      logLevel = 'warn';
    }

    // Log response
    req.logger[logLevel](
      {
        event: 'http.request.completed',
        method: req.method,
        url: req.url,
        path: req.path,
        statusCode,
        duration,
        contentLength: res.get('content-length'),
        isSlowQuery: duration > 1000,
      },
      `HTTP ${req.method} ${req.path} ${statusCode} - ${duration}ms`
    );

    // Call the original end function
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

export default httpLoggerMiddleware;
