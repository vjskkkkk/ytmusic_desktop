// Winamp 2 skins (.wsz) the user has added, stored in %APPDATA%\ytmini\skins.
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const MAX_SKIN_BYTES = 20 * 1024 * 1024;
const dir = () => path.join(app.getPath('userData'), 'skins');

function list() {
  try {
    return fs.readdirSync(dir())
      .filter((f) => /\.(wsz|zip)$/i.test(f))
      .sort((a, b) => a.localeCompare(b))
      .map((file) => ({ file, name: file.replace(/\.(wsz|zip)$/i, '') }));
  } catch {
    return [];
  }
}

// Only plain file names inside the skins folder are accepted.
function resolve(file) {
  if (typeof file !== 'string' || path.basename(file) !== file || !/\.(wsz|zip)$/i.test(file)) {
    throw new Error('Invalid skin file name');
  }
  return path.join(dir(), file);
}

function importFile(srcPath) {
  if (!/\.(wsz|zip)$/i.test(srcPath)) throw new Error('Winamp skins are .wsz files');
  const stat = fs.statSync(srcPath);
  if (stat.size > MAX_SKIN_BYTES) throw new Error('Skin file is too large');
  const header = Buffer.alloc(2);
  const fd = fs.openSync(srcPath, 'r');
  fs.readSync(fd, header, 0, 2, 0);
  fs.closeSync(fd);
  if (header.toString('latin1') !== 'PK') throw new Error('Not a valid .wsz (zip) file');

  fs.mkdirSync(dir(), { recursive: true });
  const base = path.basename(srcPath).replace(/[^\w.\- ()[\]]+/g, '_');
  let file = base;
  for (let n = 2; fs.existsSync(path.join(dir(), file)); n++) {
    file = base.replace(/(\.\w+)$/, ` (${n})$1`);
  }
  fs.copyFileSync(srcPath, path.join(dir(), file));
  return file;
}

function read(file) {
  return new Uint8Array(fs.readFileSync(resolve(file)));
}

function remove(file) {
  fs.rmSync(resolve(file), { force: true });
}

module.exports = { list, importFile, read, remove, dir };
