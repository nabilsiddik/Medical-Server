import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import {
  S3Client,
  PutObjectCommand,
  type ObjectCannedACL,
} from "@aws-sdk/client-s3";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { envVars } from "../config/env.config.js";

// Configure Cloudinary
if (envVars.CLOUDINARY?.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: envVars.CLOUDINARY.CLOUDINARY_CLOUD_NAME,
    api_key: envVars.CLOUDINARY.CLOUDINARY_API_KEY,
    api_secret: envVars.CLOUDINARY.CLOUDINARY_API_SECRET,
  });
}

// Configure DigitalOcean Spaces / S3
const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: envVars.DO_SPACE?.DO_SPACE_ENDPOINT || "https://nyc3.digitaloceanspaces.com",
  credentials: {
    accessKeyId: envVars.DO_SPACE?.DO_SPACE_ACCESS_KEY || "",
    secretAccessKey: envVars.DO_SPACE?.DO_SPACE_SECRET_KEY || "",
  },
});

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Upload helpers
const uploadSingle = upload.single("profileImage");
const uploadFile = upload.single("file");
const uploadMultipleImage = upload.fields([{ name: "images", maxCount: 10 }]);

// Upload to Cloudinary buffer
const uploadToCloudinary = async (
  file: Express.Multer.File,
): Promise<{ Location: string; public_id: string }> => {
  if (!file) {
    throw new Error("File is required for uploading.");
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "uploads",
        resource_type: "auto",
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          console.error("Error uploading file to Cloudinary:", error);
          return reject(error);
        }

        resolve({
          Location: result?.secure_url || "",
          public_id: result?.public_id || "",
        });
      },
    );

    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
};

// Upload to DigitalOcean Spaces / S3
const uploadToDigitalOcean = async (file: Express.Multer.File) => {
  if (!file) {
    throw new Error("File is required for uploading.");
  }

  try {
    const Key = `uploads/${Date.now()}_${uuidv4()}_${file.originalname}`;
    const uploadParams = {
      Bucket: envVars.DO_SPACE?.DO_SPACE_BUCKET || "",
      Key,
      Body: file.buffer,
      ACL: "public-read" as ObjectCannedACL,
      ContentType: file.mimetype,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    const fileURL = `${envVars.DO_SPACE?.DO_SPACE_ENDPOINT}/${envVars.DO_SPACE?.DO_SPACE_BUCKET}/${Key}`;
    return {
      Location: fileURL,
      Bucket: envVars.DO_SPACE?.DO_SPACE_BUCKET || "",
      Key,
    };
  } catch (error) {
    console.error("Error uploading file to DigitalOcean:", error);
    throw error;
  }
};

export const fileUploader = {
  upload,
  uploadSingle,
  uploadMultipleImage,
  uploadFile,
  uploadToCloudinary,
  uploadToDigitalOcean,
};