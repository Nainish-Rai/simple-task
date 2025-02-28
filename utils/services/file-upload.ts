import { Account, Client, Storage, ID } from "appwrite";
import { Attachment } from "@prisma/client";

if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  throw new Error("NEXT_PUBLIC_APPWRITE_ENDPOINT is not defined");
if (!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  throw new Error("NEXT_PUBLIC_APPWRITE_PROJECT_ID is not defined");
if (!process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET)
  throw new Error("NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET is not defined");

const client = new Client();
client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

const storage = new Storage(client);

const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET;
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

  static async uploadFile(file: File, userId: string): Promise<Attachment> {
    await this.validateFile(file);

    try {
      // Upload file to Appwrite storage
      const fileId = ID.unique();
      const result = await storage.createFile(BUCKET_ID, fileId, file);

      // Get file view URL
      const url = storage.getFileView(BUCKET_ID, result.$id);

      return {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        url,
        uploadedAt: new Date(),
      };
    } catch (error) {
      console.error("File upload error:", error);
      throw new Error("Failed to upload file");
    }
  }

  static async deleteFile(fileId: string): Promise<void> {
    try {
      await storage.deleteFile(BUCKET_ID, fileId);
    } catch (error) {
      console.error("File deletion error:", error);
      throw new Error("Failed to delete file");
    }
  }

  static getFileUrl(fileId: string): string {
    return storage.getFileView(BUCKET_ID, fileId);
  }

  static extractFileIdFromUrl(url: string): string {
    const segments = url.split("/");
    return segments[segments.length - 1];
  }
}
