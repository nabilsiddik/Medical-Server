import type { IStorageProvider, UploadResult } from "./storage.interface.js";
import { fileUploader } from "../../utils/fileUploader.js";
import path from "path";
import fs from "fs";

export class CloudinaryStorageProvider implements IStorageProvider {
  name = "Cloudinary Storage";

  async uploadFile(file: Express.Multer.File, _folder = "doctor_practice"): Promise<UploadResult> {
    try {
      const res = await fileUploader.uploadToCloudinary(file);
      return {
        url: res.Location,
        key: (res as any).Key || res.public_id || file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch {
      // Fallback to local storage if Cloudinary fails
      const fallback = new LocalDiskStorageProvider();
      return fallback.uploadFile(file);
    }
  }

  async getSignedDownloadUrl(key: string, _expiresInSeconds = 3600): Promise<string> {
    return key.startsWith("http") ? key : `https://res.cloudinary.com/${key}`;
  }
}

export class LocalDiskStorageProvider implements IStorageProvider {
  name = "Local Disk Storage";

  private uploadsDir = path.resolve(process.cwd(), "public/uploads");

  constructor() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File, _folder?: string): Promise<UploadResult> {
    const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = path.join(this.uploadsDir, fileName);

    fs.writeFileSync(filePath, file.buffer);

    return {
      url: `/uploads/${fileName}`,
      key: fileName,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async getSignedDownloadUrl(key: string): Promise<string> {
    return `/uploads/${key}`;
  }
}

export const getStorageProvider = (): IStorageProvider => {
  return new CloudinaryStorageProvider();
};
