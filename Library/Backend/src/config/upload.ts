import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const digitalDir = path.join(uploadDir, 'digital');
if (!fs.existsSync(digitalDir)) {
  fs.mkdirSync(digitalDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, digitalDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

export const digitalUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(pdf|epub|doc|docx|xls|xlsx|ppt|pptx|mp3|mp4|avi|mov|txt|csv)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});
