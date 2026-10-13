import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { StorageProvider } from "./types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const BUCKET_NAME = "captures";
const DEFAULT_URL_EXPIRATION = 3600; // 1 hour

export function validateFileConstraints(
  mimeType: string,
  fileSizeBytes: number,
): void {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(
      `Unsupported file type. Allowed types are: ${ALLOWED_MIME_TYPES.join(
        ", ",
      )}.`,
    );
  }

  if (fileSizeBytes > MAX_FILE_SIZE) {
    throw new Error(
      `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
    );
  }
}

export function generateStoragePath(
  userId: string,
  captureId: string,
  filename: string,
): string {
  if (!userId || !captureId || !filename) {
    throw new Error("Missing required path components.");
  }

  // Prevent directory traversal
  if (filename.includes("..") || filename.includes("/")) {
    throw new Error("Invalid filename.");
  }

  // Sanitize path components
  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-]/g, "");
  const sanitizedCaptureId = captureId.replace(/[^a-zA-Z0-9-]/g, "");
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");

  return `${sanitizedUserId}/${sanitizedCaptureId}/${sanitizedFilename}`;
}

class SupabaseStorageService implements StorageProvider {
  async uploadFile(
    path: string,
    file: Blob | Buffer | ArrayBuffer,
    mimeType: string,
  ): Promise<string> {
    try {
      const supabase = await getSupabaseServerClient();

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, file, {
          contentType: mimeType,
          upsert: true,
        });

      if (error) {
        throw error;
      }

      if (!data?.path) {
        throw new Error("Upload failed: No path returned");
      }

      return data.path;
    } catch (error) {
      const e = error as Error;
      throw new Error(
        `Failed to upload file: ${e.message || "Unknown error"}`,
      );
    }
  }

  async getSignedUrl(
    path: string,
    expiresInSeconds: number = DEFAULT_URL_EXPIRATION,
  ): Promise<string> {
    try {
      const supabase = await getSupabaseServerClient();

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(path, expiresInSeconds);

      if (error) {
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error("Failed to generate signed URL: No URL returned");
      }

      return data.signedUrl;
    } catch (error) {
      const e = error as Error;
      throw new Error(
        `Failed to generate signed URL: ${e.message || "Unknown error"}`,
      );
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      const supabase = await getSupabaseServerClient();

      const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

      if (error) {
        throw error;
      }
    } catch (error) {
      const e = error as Error;
      throw new Error(
        `Failed to delete file: ${e.message || "Unknown error"}`,
      );
    }
  }
}

export const storageService = new SupabaseStorageService();
