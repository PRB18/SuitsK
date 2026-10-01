'use strict';

/**
 * errorHandler.js — Global Express error handler
 * 
 * Prevents internal error messages (like database schema errors or file paths)
 * from leaking to the client in production.
 */
function errorHandler(err, req, res, next) {
  // Always log the full error for debugging in the server console
  console.error('[Global Error]', err);

  if (res.headersSent) {
    return next(err);
  }

  // In production, return a generic message unless it's a known safe error type
  if (process.env.NODE_ENV === 'production') {
    // CSRF errors from doubleCsrf
    if (err.code === 'EBADCSRFTOKEN') {
      return res.status(403).json({ error: 'Invalid or missing CSRF token. Please refresh the page.' });
    }
    
    // Default fallback
    return res.status(500).json({ error: 'Internal server error.' });
  }

  // In development, send the raw error message to help debugging
  res.status(500).json({ error: err.message || 'Internal server error.' });
}

module.exports = errorHandler;
