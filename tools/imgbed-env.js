/**
 * Read the local image-host configuration.
 *
 * The config file contains local credentials and paths. Never print the parsed
 * object or the private key: callers should only expose field names in errors.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ENV_FILE = path.join(__dirname, '..', '.env.imgbed.host');

function parseEnvFile(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`image host config not found: ${file}`);
  }

  const values = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(text);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function loadImageHostEnv(required) {
  const values = fs.existsSync(ENV_FILE) ? parseEnvFile(ENV_FILE) : {};
  const merged = { ...values };
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('IMGHOST_') && value) merged[key] = value;
  }

  const missing = required.filter((key) => !merged[key]);
  if (missing.length) {
    throw new Error(`image host config missing: ${missing.join(', ')} (${ENV_FILE})`);
  }

  return merged;
}

module.exports = { ENV_FILE, loadImageHostEnv, parseEnvFile };
