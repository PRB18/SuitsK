'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const LEGACY_DATA_DIR = path.join(__dirname, '..', 'data');
const LOCAL_APP_DATA = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const DATA_DIR = process.env.KRISHNA_DATA_DIR || path.join(LOCAL_APP_DATA, 'KrishnaSuitsCustom', 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const DB_PATH = path.join(DATA_DIR, 'suits.db');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

function copyIfPresent(source, destination) {
  if (!fs.existsSync(source) || fs.existsSync(destination)) return false;
  const temporaryPath = `${destination}.tmp`;
  fs.copyFileSync(source, temporaryPath);
  fs.renameSync(temporaryPath, destination);
  return true;
}

function migrateLegacyData() {
  if (path.resolve(DATA_DIR) === path.resolve(LEGACY_DATA_DIR)) return;

  const targetHasVault = fs.existsSync(CONFIG_PATH) || fs.existsSync(DB_PATH);
  if (targetHasVault || !fs.existsSync(LEGACY_DATA_DIR)) return;

  copyIfPresent(path.join(LEGACY_DATA_DIR, 'config.json'), CONFIG_PATH);
  copyIfPresent(path.join(LEGACY_DATA_DIR, 'suits.db'), DB_PATH);
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  migrateLegacyData();
}

function createVaultBackup() {
  ensureDataDir();
  if (!fs.existsSync(CONFIG_PATH) || !fs.existsSync(DB_PATH)) {
    throw new Error('Vault files are incomplete; backup was not created.');
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, stamp);
  fs.mkdirSync(backupPath, { recursive: true, mode: 0o700 });

  try {
    fs.copyFileSync(CONFIG_PATH, path.join(backupPath, 'config.json'));
    fs.copyFileSync(DB_PATH, path.join(backupPath, 'suits.db'));
  } catch (err) {
    fs.rmSync(backupPath, { recursive: true, force: true });
    throw err;
  }

  return { backupName: stamp, backupPath };
}

module.exports = {
  DATA_DIR,
  CONFIG_PATH,
  DB_PATH,
  BACKUP_DIR,
  ensureDataDir,
  createVaultBackup,
};
