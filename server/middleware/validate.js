'use strict';

/**
 * validate.js — Zod schema validation middleware
 * 
 * Validates req.body against a Zod schema. If validation fails,
 * it returns a 400 Bad Request with the formatted Zod errors.
 */
function validate(schema) {
  return (req, res, next) => {
    try {
      // parse() throws an error if validation fails
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        const errors = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        return res.status(400).json({ error: `Validation Error: ${errors}` });
      }
      next(err);
    }
  };
}

module.exports = { validate };
