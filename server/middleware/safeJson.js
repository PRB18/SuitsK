'use strict';
/**
 * safeJsonParse
 * 
 * Safely parses a JSON string, catching any exceptions and returning a fallback value.
 * Protects against insecure deserialization / unhandled errors from malformed data in the DB.
 */
function safeJsonParse(str, fallback = {}) {
  try {
    return JSON.parse(str);
  } catch (err) {
    console.warn('[safeJsonParse] Failed to parse JSON, returning fallback:', err.message);
    return fallback;
  }
}

module.exports = { safeJsonParse };
