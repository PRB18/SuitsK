'use strict';
/**
 * requireUnlocked.js — Express middleware
 *
 * Rejects any request with 401 if the database is currently locked.
 * Applied to all /api/suits routes.
 */

const { isUnlocked } = require('../db');

function requireUnlocked(req, res, next) {
  if (!isUnlocked()) {
    return res.status(401).json({ error: 'Database is locked. Please unlock first.' });
  }
  next();
}

module.exports = requireUnlocked;
