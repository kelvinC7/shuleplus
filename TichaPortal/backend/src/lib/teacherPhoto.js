const fs = require('fs');
const path = require('path');

const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const MAX_BYTES = 5 * 1024 * 1024;

function photoDir() {
  const dir = path.resolve(__dirname, '../../uploads/teachers');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function photoPublicPath(userId, ext) {
  return `/uploads/teachers/${userId}${ext}`;
}

function existingPhoto(userId) {
  const dir = photoDir();
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
    const file = path.join(dir, `${userId}${ext}`);
    if (fs.existsSync(file)) return photoPublicPath(userId, ext);
  }
  return null;
}

function decodeDataUrl(dataUrl) {
  const raw = String(dataUrl || '').trim();
  const match = raw.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return null;
  const mime = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  return { mime, buffer };
}

function saveTeacherPhoto(userId, dataUrl) {
  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) {
    const err = new Error('Use a JPEG, PNG, or WebP image.');
    err.status = 400;
    throw err;
  }
  const ext = ALLOWED[decoded.mime];
  if (!ext) {
    const err = new Error('Use a JPEG, PNG, or WebP image.');
    err.status = 400;
    throw err;
  }
  if (!decoded.buffer.length) {
    const err = new Error('Image file is empty.');
    err.status = 400;
    throw err;
  }
  if (decoded.buffer.length > MAX_BYTES) {
    const err = new Error('Image must be under 5MB.');
    err.status = 400;
    throw err;
  }

  const dir = photoDir();
  for (const old of ['.jpg', '.jpeg', '.png', '.webp']) {
    const prev = path.join(dir, `${userId}${old}`);
    if (fs.existsSync(prev)) fs.unlinkSync(prev);
  }
  fs.writeFileSync(path.join(dir, `${userId}${ext}`), decoded.buffer);
  return photoPublicPath(userId, ext);
}

module.exports = { existingPhoto, saveTeacherPhoto, photoDir };
