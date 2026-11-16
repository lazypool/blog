'use strict';

/**
 * ImageHost replace/lock behaviour against an in-memory SFTP client: no
 * server, no network.
 */

const assert = require('node:assert/strict');
const { test } = require('node:test');

const { ImageHost } = require('../tools/imgbed-sftp');

function missing(file) {
  return Object.assign(new Error(`No such file: ${file}`), { code: 2 });
}

/** Just enough of ssh2-sftp-client (plus its raw `.sftp`) for ImageHost. */
class FakeSftp {
  constructor(files = {}, { posixRename = true, failRename = () => false } = {}) {
    this.files = new Map(Object.entries(files));
    this.supportsPosixRename = posixRename;
    this.failRename = failRename;
    this.sftp = {
      writeFile: (file, data, options, cb) => {
        if (options.flag === 'wx' && this.files.has(file)) cb(new Error('Failure'));
        else cb(null, this.files.set(file, String(data)));
      },
    };
  }

  async posixRename(from, to) {
    if (!this.supportsPosixRename) throw new Error('posix-rename@openssh.com not supported');
    if (!this.files.has(from)) throw missing(from);
    this.files.set(to, this.files.get(from));
    this.files.delete(from);
  }

  async rename(from, to) {
    if (!this.files.has(from)) throw missing(from);
    if (this.files.has(to)) throw new Error(`Failure: ${to} exists`);
    if (this.failRename(from, to)) throw new Error('Failure');
    this.files.set(to, this.files.get(from));
    this.files.delete(from);
  }

  async delete(file, notFoundOK = false) {
    if (!this.files.delete(file) && !notFoundOK) throw missing(file);
  }

  async get(file) {
    if (!this.files.has(file)) throw missing(file);
    return Buffer.from(this.files.get(file));
  }

  async end() {}
}

test('replace uses posix-rename when available', async () => {
  const sftp = new FakeSftp({ '/r/a.png': 'old', '/r/a.png.tmp': 'new' });
  await new ImageHost(sftp, '/r').replace('/r/a.png.tmp', '/r/a.png');
  assert.deepEqual([...sftp.files], [['/r/a.png', 'new']]);
});

test('replace fallback never leaves the destination missing', async () => {
  const ok = new FakeSftp({ '/r/a.png': 'old', '/r/a.png.tmp': 'new' }, { posixRename: false });
  await new ImageHost(ok, '/r').replace('/r/a.png.tmp', '/r/a.png');
  assert.deepEqual([...ok.files], [['/r/a.png', 'new']]);

  const fresh = new FakeSftp({ '/r/a.png.tmp': 'new' }, { posixRename: false });
  await new ImageHost(fresh, '/r').replace('/r/a.png.tmp', '/r/a.png');
  assert.deepEqual([...fresh.files], [['/r/a.png', 'new']]);

  // The second rename fails: the old file is moved back into place.
  const failing = new FakeSftp(
    { '/r/a.png': 'old', '/r/a.png.tmp': 'new' },
    { posixRename: false, failRename: (from) => from === '/r/a.png.tmp' }
  );
  await assert.rejects(new ImageHost(failing, '/r').replace('/r/a.png.tmp', '/r/a.png'), /Failure/);
  assert.equal(failing.files.get('/r/a.png'), 'old');
  assert.deepEqual([...failing.files.keys()].filter((f) => f.endsWith('.bak')), []);
});

test('lock is exclusive, names its holder and is released by end()', async () => {
  const sftp = new FakeSftp();
  const first = new ImageHost(sftp, '/r');
  await first.lock();
  const holder = JSON.parse(sftp.files.get('/r/.imgbed-lock'));
  assert.equal(holder.pid, process.pid);

  await assert.rejects(new ImageHost(sftp, '/r').lock(), /locked by .* \(pid \d+\).*delete \/r\/\.imgbed-lock/);
  await first.end();
  assert.equal(sftp.files.has('/r/.imgbed-lock'), false);

  const second = new ImageHost(sftp, '/r');
  await second.lock();
  await second.end();
});
