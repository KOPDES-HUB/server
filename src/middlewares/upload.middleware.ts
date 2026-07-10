import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import type { Request } from "express";

const BASE_UPLOAD_DIR = process.env.FILE_URL || "uploads";

const LOGO_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const LOGO_ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp"];

const ensureDirectoryExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.join(BASE_UPLOAD_DIR, "logos");
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `logo-${Date.now()}-${crypto.randomBytes(16).toString("hex")}${ext}`;
    cb(null, uniqueName);
  },
});

const logoFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!LOGO_ALLOWED_MIME.includes(file.mimetype)) {
    return cb(new Error("Format file harus JPG, PNG, WebP, atau SVG"));
  }

  if (!LOGO_ALLOWED_EXT.includes(ext)) {
    return cb(new Error("Ekstensi file tidak valid"));
  }

  cb(null, true);
};

const logoUploadMiddleware = multer({
  storage: logoStorage,
  fileFilter: logoFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
});

const handleUploadError = (err: any, _req: Request, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Ukuran file maksimal 2MB" });
    }
    return res.status(400).json({ message: err.message });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

export const withLogoUpload = [
  logoUploadMiddleware.single("logo"),
  handleUploadError,
];

export const deleteLogoFile = (filename: string): boolean => {
  const filePath = path.join(BASE_UPLOAD_DIR, "logos", filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
};

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.join(BASE_UPLOAD_DIR, "avatars");
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `avatar-${Date.now()}-${crypto.randomBytes(16).toString("hex")}${ext}`;
    cb(null, uniqueName);
  },
});

const avatarUploadMiddleware = multer({
  storage: avatarStorage,
  fileFilter: logoFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
});

export const withAvatarUpload = [
  avatarUploadMiddleware.single("avatar"),
  handleUploadError,
];

export const deleteAvatarFile = (filename: string): boolean => {
  if (!filename) return false;
  const cleanFilename = filename.startsWith("/") ? filename.substring(1) : filename;
  const filePath = path.resolve(cleanFilename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
};

const appFilesStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.join(BASE_UPLOAD_DIR, "application-files");
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const originalNameClean = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "-");
    const uniqueName = `file-${Date.now()}-${originalNameClean}${ext}`;
    cb(null, uniqueName);
  },
});

const appFilesFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = [
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt",
    ".zip", ".rar", ".7z", ".png", ".jpg", ".jpeg", ".webp"
  ];
  if (!allowedExts.includes(ext)) {
    return cb(new Error("Format file tidak didukung"));
  }
  cb(null, true);
};

const appFilesUploadMiddleware = multer({
  storage: appFilesStorage,
  fileFilter: appFilesFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10,
  },
});

export const withApplicationFilesUpload = [
  appFilesUploadMiddleware.array("files", 10),
  handleUploadError,
];

export const deleteApplicationFile = (filename: string): boolean => {
  if (!filename) return false;
  const cleanFilename = filename.startsWith("/") ? filename.substring(1) : filename;
  const filePath = path.resolve(cleanFilename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
};


