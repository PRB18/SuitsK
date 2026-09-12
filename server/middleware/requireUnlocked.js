'use strict';
/**
 * requireUnlocked.js — Express middleware
 *
 * Checks req.session.unlocked instead of the old db.isUnlocked().
 * Session is set by auth.js when the vault password is verified.
 */

function requireUnlocked(req, res, next) {
  if (!req.session || !req.session.unlocked) {
    return res.status(401).json({ error: 'Vault is locked. Please unlock first.' });
  }
  next();
}

module.exports = requireUnlocked;
