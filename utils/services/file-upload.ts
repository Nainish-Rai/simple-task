import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "video/mp4",
  "audio/mpeg",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export class FileUploadService {
  static async validateFile(file: File): Promise<void> {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error("File type not supported");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error("File size exceeds 10MB limit");
    }
  }

  static generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(16).toString("hex");
    const extension = originalName.split(".").pop();
    return `${timestamp}-${randomString}.${extension}`;
  }

  static async uploadFile(
    file: File,
    userId: string
  ): Promise<{
    fileName: string;
    fileSize: number;
    fileType: string;
    url: string;
    uploadedAt: Date;
  }> {
    await this.validateFile(file);

    const fileName = this.generateFileName(file.name);
    const key = `uploads/${userId}/${fileName}`;

    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: file.type,
      Body: new Uint8Array(await file.arrayBuffer()),
      Metadata: {
        userId,
        originalName: file.name,
      },
    });

    await s3Client.send(uploadCommand);

    // Generate a signed URL that expires in 7 days
    const url = await getSignedUrl(
      s3Client,
      new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
      { expiresIn: 604800 } // 7 days
    );

    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      url,
      uploadedAt: new Date(),
    };
  }

  static async deleteFile(key: string): Promise<void> {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(deleteCommand);
  }

  static async getSignedUrl(key: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn: 604800 }); // 7 days
  }

  static extractKeyFromUrl(url: string): string {
    const urlObj = new URL(url);
    return urlObj.pathname.slice(1); // Remove leading slash
  }
}
