'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');

const MAX_SAVE_BYTES = 1024 * 1024;
const REPO_DIR = path.resolve(__dirname, '..');

class SaveError extends Error {
  constructor(message, status = 500, code = status === 409 ? 'SAVE_CONFLICT' : status === 413 ? 'SAVE_TOO_LARGE' : status < 500 ? 'REQUEST_REJECTED' : 'SAVE_SERVICE_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function inside(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

// Resolve even a not-yet-created folder through its closest existing ancestor.
async function resolvedLocation(location) {
  let current = path.resolve(location);
  const missing = [];
  for (;;) {
    try { return path.join(await fs.realpath(current), ...missing.reverse()); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      missing.push(path.basename(current));
      current = parent;
    }
  }
}

function defaultDataDir() {
  const base = process.platform === 'win32'
    ? process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
    : process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Application Support')
      : process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(base, 'PomodoroTimer', 'saves');
}

function validateState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state) || state.schemaVersion !== 1) {
    throw new SaveError('Save must be an object with schemaVersion 1.', 400);
  }
  if (Buffer.byteLength(JSON.stringify(state), 'utf8') > MAX_SAVE_BYTES) {
    throw new SaveError('Save exceeds the 1 MB limit.', 413);
  }
}

function validateRecord(record) {
  if (!record || record.formatVersion !== 1 || !Number.isSafeInteger(record.revision) || record.revision < 1) {
    throw new Error('Invalid save envelope.');
  }
  validateState(record.state);
  return record;
}

async function createStore({ dataDir = process.env.POMODORO_DATA_DIR || defaultDataDir(), repoDir = REPO_DIR } = {}) {
  const requestedDir = path.resolve(dataDir);
  const resolvedRepo = await fs.realpath(repoDir);
  const storagePath = await resolvedLocation(requestedDir);
  if (inside(requestedDir, path.resolve(repoDir)) || inside(storagePath, resolvedRepo)) {
    throw new Error('Personal saves must be outside the repository. Choose another POMODORO_DATA_DIR.');
  }
  await fs.mkdir(storagePath, { recursive: true, mode: 0o700 });
  if ((await fs.realpath(storagePath)) !== storagePath) throw new Error('Save directory changed during initialization.');
  const mainPath = path.join(storagePath, 'state.json');
  const backupPath = path.join(storagePath, 'state.backup.json');
  let queue = Promise.resolve();

  function exclusive(operation) {
    const next = queue.then(operation);
    queue = next.catch(() => {});
    return next;
  }

  async function checkDirectory() {
    if ((await fs.realpath(storagePath)) !== storagePath) throw new SaveError('Save directory changed. Restart after restoring it.', 500, 'SAVE_DIRECTORY_CHANGED');
  }

  async function readRecord(file) {
    try {
      const stat = await fs.lstat(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new Error('Save must be a regular file.');
      if (stat.size > MAX_SAVE_BYTES + 1024) throw new Error('Save is too large.');
      return { record: validateRecord(JSON.parse(await fs.readFile(file, 'utf8'))) };
    } catch (error) {
      return error.code === 'ENOENT' ? { missing: true } : { error };
    }
  }

  async function atomicWrite(file, record) {
    await checkDirectory();
    const temporary = path.join(storagePath, `.state-${randomUUID()}.tmp`);
    let handle;
    try {
      handle = await fs.open(temporary, 'wx', 0o600);
      await handle.writeFile(JSON.stringify(record), 'utf8');
      await handle.sync();
      await handle.close();
      handle = null;
      await fs.rename(temporary, file);
    } finally {
      if (handle) await handle.close();
      await fs.rm(temporary, { force: true }).catch(() => {});
    }
  }

  async function load() {
    await checkDirectory();
    const main = await readRecord(mainPath);
    if (main.record) return { ...main.record, recovered: false };
    const backup = await readRecord(backupPath);
    if (backup.record) {
      await atomicWrite(mainPath, backup.record);
      return { ...backup.record, recovered: true };
    }
    if (main.missing && backup.missing) return { state: null, revision: 0, recovered: false };
    if ([main, backup].some(result => ['EACCES', 'EPERM', 'ENOSPC', 'EROFS', 'EIO'].includes(result.error?.code))) {
      throw new SaveError('The save folder could not be accessed. Check permissions and disk space.', 500, 'SAVE_STORAGE_UNAVAILABLE');
    }
    throw new SaveError('Both the save and its backup could not be read. Existing files were preserved.', 500, 'SAVE_UNREADABLE');
  }

  return {
    storagePath,
    read: () => exclusive(async () => {
      const { state, revision, recovered } = await load();
      return { state, revision, storagePath, recovered };
    }),
    write: (state, revision) => exclusive(async () => {
      validateState(state);
      if (!Number.isSafeInteger(revision) || revision < 0) throw new SaveError('A valid save revision is required.', 400);
      const previous = await load();
      if (previous.revision !== revision) throw new SaveError('This save changed in another window. Reload to use the latest progress.', 409);
      if (revision >= Number.MAX_SAFE_INTEGER) throw new SaveError('Save revision limit reached.');
      const next = { formatVersion: 1, revision: revision + 1, savedAt: new Date().toISOString(), state };
      if (previous.state !== null) {
        const { recovered, ...record } = previous;
        await atomicWrite(backupPath, record);
      }
      await atomicWrite(mainPath, next);
      // The first save has a recovery copy too; subsequent backups retain the previous revision.
      if (previous.state === null) await atomicWrite(backupPath, next);
      return { revision: next.revision };
    }),
  };
}

module.exports = { createStore, defaultDataDir, MAX_SAVE_BYTES, SaveError, inside };
