import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileUploadProps, EventFormDataAttachment } from "@/utils/types";
import { Button } from "./button";
import { Progress } from "./progress";
import { cn } from "@/utils/cn";
import { X } from "lucide-react";
import { isFileAttachment, isUploadedAttachment } from "@/utils/file-helpers";

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  onFileRemove,
  files = [],
  maxFiles = 10,
  accept = {
    "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      ".xlsx",
    ],
    "video/mp4": [".mp4"],
    "audio/mpeg": [".mp3"],
  },
  className,
}) => {
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (files.length + acceptedFiles.length > maxFiles) {
        alert(`You can only upload up to ${maxFiles} files`);
        return;
      }

      setUploading(true);

      for (const file of acceptedFiles) {
        try {
          setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

          await onFileUpload(file);

          setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
        } catch (error) {
          console.error("Error uploading file:", error);
          setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));
        }
      }

      setUploading(false);
    },
    [files.length, maxFiles, onFileUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: maxFiles - files.length,
  });

  const handleRemove = async (file: EventFormDataAttachment) => {
    if (onFileRemove) {
      try {
        if (isFileAttachment(file)) {
          await onFileRemove(file.file.name);
        } else if (isUploadedAttachment(file)) {
          await onFileRemove(file.url);
        }
      } catch (error) {
        console.error("Error removing file:", error);
      }
    }
  };

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/20",
          className
        )}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-center text-sm text-muted-foreground">
            Drop the files here...
          </p>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Drag & drop files here, or click to select files
          </p>
        )}
      </div>

      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((file) => (
            <li
              key={isUploadedAttachment(file) ? file.url : file.file.name}
              className="flex items-center justify-between p-2 bg-muted rounded-md"
            >
              <div className="flex items-center space-x-2 overflow-hidden">
                <span className="text-sm truncate flex-1">
                  {isFileAttachment(file) ? file.file.name : file.fileName}
                </span>
                <span className="text-xs text-muted-foreground">
                  (
                  {Math.round(
                    (isFileAttachment(file)
                      ? file.file.size
                      : file.fileSize ?? 0) / 1024
                  )}{" "}
                  KB)
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleRemove(file)}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {Object.entries(uploadProgress).map(
        ([fileName, progress]) =>
          progress !== 100 && (
            <div key={fileName} className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span>{fileName}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1" />
            </div>
          )
      )}

      {uploading && (
        <p className="text-sm text-muted-foreground mt-2">Uploading files...</p>
      )}
    </div>
  );
};
