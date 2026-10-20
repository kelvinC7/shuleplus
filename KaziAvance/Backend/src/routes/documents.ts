import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { type EmployeeRequest } from "../middleware/employee";
import { AppError } from "../middleware/error";

const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => cb(null, `${uuid()}-${file.originalname.replace(/\s+/g, "_")}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    cb(null, allowed.includes(file.mimetype));
  }
});

export const documentsRouter = Router();

documentsRouter.post("/upload", upload.single("file"), async (req: EmployeeRequest, res, next) => {
  if (!req.file) return next(new AppError(400, "file is required"));

  try {
    const category = String(req.body.category ?? "Other");
    const doc = await prisma.employeeDocument.create({
      data: {
        employeeId: req.employeeId!,
        category,
        originalName: req.file.originalname,
        filePath: req.file.filename,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size
      }
    });
    return res.status(201).json({ document: doc });
  } catch (error) {
    return next(error);
  }
});

documentsRouter.get("/", async (req: EmployeeRequest, res, next) => {
  try {
    const documents = await prisma.employeeDocument.findMany({
      where: { employeeId: req.employeeId! },
      orderBy: { uploadedAt: "desc" }
    });
    return res.json({ data: documents });
  } catch (error) {
    return next(error);
  }
});
