import { Attachment } from "@prisma/client";
import { EventFormDataAttachment } from "./types";

export function isFileAttachment(
  attachment: EventFormDataAttachment
): attachment is {
  file: File;
  fileName: string;
  fileType: string;
  fileSize: number;
} {
  return "file" in attachment && attachment.file instanceof File;
}

export function isUploadedAttachment(
  attachment: EventFormDataAttachment
): attachment is Attachment {
  return "url" in attachment && "uploadedAt" in attachment;
}
