/**
 * Centralized Error Handling Middleware for Express
 */
const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Lỗi hệ thống nội bộ.';

  console.error(`[Error] ${req.method} ${req.url}:`, err);

  return res.status(statusCode).json({
    status: 'error',
    data: null,
    message,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  });
};

module.exports = errorHandler;
