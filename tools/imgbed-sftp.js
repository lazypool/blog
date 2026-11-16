/**
 * SFTP access to the image host for `tools/images.js`.
 *
 * Remote layout below IMGHOST_REMOTE_ROOT:
 *   posts/<year>/<slug>/<file>   public images
 *   .imgbed-manifest.json        { size, sha256 } per uploaded image
 *   .imgbed-lock                 held by a running sync (exclusive create)
 *
 * The manifest and lock are written with mode 0600 and are not chowned to the
 * web user, so a web server running as another user cannot serve them.
 *
 * Only one sync may modify the host at a time: `lock()` creates the lock file
 * with SFTP's O_EXCL open flag (part of SFTP v3, not an extension) before the
 * manifest is read, and `end()` removes it. A sync killed hard leaves the lock
 * behind; it then has to be deleted by hand.
 */

'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  isImageName,
  parseManifest,
  serializeManifest,
  splitKey,
} = require('./imgbed');

const MANIFEST_NAME = '.imgbed-manifest.json';
const LOCK_NAME = '.imgbed-lock';
const YEAR_RE = /^\d{4}$/;
const SEGMENT_RE = /^[A-Za-z0-9._-]+$/;

function sftpCall(sftp, method, ...args) {
  return new Promise((resolve, reject) => {
    sftp[method](...args, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}

function isMissing(error) {
  return error && (error.code === 2 || /no such file|not exist/i.test(error.message));
}

/** Per-process suffix so temporary names never collide between machines. */
function tempSuffix() {
  return `${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
}

class ImageHost {
  constructor(sftp, root) {
    this.sftp = sftp;
    this.root = root;
    this.postsRoot = path.posix.join(root, 'posts');
    this.manifestPath = path.posix.join(root, MANIFEST_NAME);
    this.lockPath = path.posix.join(root, LOCK_NAME);
    this.locked = false;
    this.preparedDirs = new Set();
    this.rootStat = null;
  }

  static async connect(config, root) {
    if (!fs.existsSync(config.IMGHOST_PRIVATE_KEY_PATH)) {
      throw new Error(`private key not found: ${config.IMGHOST_PRIVATE_KEY_PATH}`);
    }
    const SftpClient = require('ssh2-sftp-client');
    const sftp = new SftpClient();
    await sftp.connect({
      host: config.IMGHOST_HOST,
      port: Number(config.IMGHOST_PORT || 22),
      username: config.IMGHOST_USER,
      privateKey: fs.readFileSync(config.IMGHOST_PRIVATE_KEY_PATH),
      readyTimeout: 20000,
    });
    const host = new ImageHost(sftp, root);
    try {
      host.rootStat = await sftp.stat(root);
    } catch (error) {
      await host.end();
      throw error;
    }
    return host;
  }

  remotePath(key) {
    return path.posix.join(this.postsRoot, key);
  }

  /** Take the single-writer lock, or throw naming its current holder. */
  async lock() {
    const owner = { host: os.hostname(), pid: process.pid, since: new Date().toISOString() };
    try {
      await sftpCall(this.sftp.sftp, 'writeFile', this.lockPath, `${JSON.stringify(owner)}\n`, {
        flag: 'wx',
        mode: 0o600,
      });
    } catch (error) {
      let holder;
      try {
        holder = JSON.parse((await this.sftp.get(this.lockPath)).toString('utf8'));
      } catch {
        throw error;
      }
      throw new Error(
        `image host is locked by ${holder.host} (pid ${holder.pid}) since ${holder.since}; ` +
          `if no sync is running there, delete ${this.lockPath} on the host`
      );
    }
    this.locked = true;
  }

  /** Release the lock (if held) and close the connection. */
  async end() {
    if (this.locked) {
      await this.sftp.delete(this.lockPath, true).catch(() => {});
      this.locked = false;
    }
    await this.sftp.end().catch(() => {});
  }

  /** Returns the parsed manifest, or null when the host has none yet. */
  async readManifest() {
    let data;
    try {
      data = await this.sftp.get(this.manifestPath);
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
    return parseManifest(data.toString('utf8'));
  }

  async writeManifest(manifest) {
    const tmp = `${this.manifestPath}.${tempSuffix()}.tmp`;
    try {
      await this.sftp.put(Buffer.from(serializeManifest(manifest)), tmp, { mode: 0o600 });
      await this.sftp.chmod(tmp, 0o600);
      await this.replace(tmp, this.manifestPath);
    } catch (error) {
      await this.sftp.delete(tmp, true).catch(() => {});
      throw error;
    }
  }

  /**
   * Move `from` over `to`. Prefers the atomic OpenSSH posix-rename extension.
   * Without it, plain SFTP rename refuses to overwrite, so the old file is
   * first moved aside and restored if the second rename fails: `to` is never
   * deleted before its replacement is in place.
   */
  async replace(from, to) {
    try {
      await this.sftp.posixRename(from, to);
      return;
    } catch {
      // Extension unsupported or failed; fall through to the two-step rename.
    }
    const backup = `${to}.${tempSuffix()}.bak`;
    let moved = false;
    try {
      await this.sftp.rename(to, backup);
      moved = true;
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
    try {
      await this.sftp.rename(from, to);
    } catch (error) {
      if (moved) await this.sftp.rename(backup, to).catch(() => {});
      throw error;
    }
    if (moved) await this.sftp.delete(backup, true).catch(() => {});
  }

  async listDir(dir) {
    try {
      return await this.sftp.list(dir);
    } catch (error) {
      if (isMissing(error)) return [];
      throw error;
    }
  }

  /** Full listing of posts/<year>/<slug>/<image>: Map key -> { size }. */
  async scan(scope = {}) {
    const out = new Map();
    for (const year of await this.listDir(this.postsRoot)) {
      if (year.type !== 'd' || !YEAR_RE.test(year.name)) continue;
      if (scope.year && year.name !== scope.year) continue;
      const yearDir = path.posix.join(this.postsRoot, year.name);
      for (const slug of await this.listDir(yearDir)) {
        if (slug.type !== 'd' || !SEGMENT_RE.test(slug.name)) continue;
        if (scope.slug && slug.name !== scope.slug) continue;
        const slugDir = path.posix.join(yearDir, slug.name);
        for (const file of await this.listDir(slugDir)) {
          if (file.type !== '-' || !SEGMENT_RE.test(file.name) || !isImageName(file.name)) continue;
          out.set(`${year.name}/${slug.name}/${file.name}`, { size: file.size || 0 });
        }
      }
    }
    return new Map([...out].sort(([a], [b]) => a.localeCompare(b)));
  }

  async prepareDir(dir) {
    if (this.preparedDirs.has(dir)) return;
    await this.sftp.mkdir(dir, true);
    await sftpCall(this.sftp.sftp, 'chown', dir, this.rootStat.uid, this.rootStat.gid);
    await sftpCall(this.sftp.sftp, 'chmod', dir, 0o755);
    this.preparedDirs.add(dir);
  }

  /**
   * Upload to a temporary name, then rename so readers never see a partial
   * file. Temporary names end in .uploading, which scan() ignores.
   */
  async upload(file, key) {
    const { year, slug } = splitKey(key);
    await this.prepareDir(this.postsRoot);
    await this.prepareDir(path.posix.join(this.postsRoot, year));
    await this.prepareDir(path.posix.join(this.postsRoot, year, slug));
    const dest = this.remotePath(key);
    const tmp = `${dest}.${tempSuffix()}.uploading`;
    try {
      await this.sftp.fastPut(file, tmp);
      await sftpCall(this.sftp.sftp, 'chown', tmp, this.rootStat.uid, this.rootStat.gid);
      await sftpCall(this.sftp.sftp, 'chmod', tmp, 0o644);
      await this.replace(tmp, dest);
    } catch (error) {
      await this.sftp.delete(tmp, true).catch(() => {});
      throw error;
    }
  }

  /** Delete one image; an already-missing file counts as deleted. */
  async remove(key) {
    try {
      await this.sftp.delete(this.remotePath(key));
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
  }

  /** Remove slug and year directories left empty by deleting `keys`. */
  async removeEmptyDirs(keys) {
    const dirs = new Set();
    for (const key of keys) {
      const { year, slug } = splitKey(key);
      dirs.add(path.posix.join(this.postsRoot, year, slug));
      dirs.add(path.posix.join(this.postsRoot, year));
    }
    const removed = [];
    for (const dir of [...dirs].sort((a, b) => b.length - a.length)) {
      try {
        await sftpCall(this.sftp.sftp, 'rmdir', dir);
        removed.push(dir);
      } catch {
        // Not empty or already gone.
      }
    }
    return removed;
  }
}

module.exports = { ImageHost, LOCK_NAME, MANIFEST_NAME };
