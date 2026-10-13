import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert";
import {
  validateFileConstraints,
  generateStoragePath,
  storageService,
} from "@/lib/storage/storage-service";
import * as serverClient from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Storage Service", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  describe("validateFileConstraints", () => {
    it("should accept valid MIME types and sizes", () => {
      assert.doesNotThrow(() =>
        validateFileConstraints("image/jpeg", 5 * 1024 * 1024),
      );
      assert.doesNotThrow(() =>
        validateFileConstraints("image/png", 10 * 1024 * 1024),
      );
      assert.doesNotThrow(() => validateFileConstraints("image/webp", 1024));
    });

    it("should reject invalid MIME types", () => {
      assert.throws(
        () => validateFileConstraints("application/pdf", 1024),
        /Unsupported file type/,
      );
      assert.throws(
        () => validateFileConstraints("image/gif", 1024),
        /Unsupported file type/,
      );
    });

    it("should reject files larger than 10MB", () => {
      assert.throws(
        () => validateFileConstraints("image/jpeg", 10 * 1024 * 1024 + 1),
        /File too large/,
      );
    });
  });

  describe("generateStoragePath", () => {
    it("should generate a valid path", () => {
      const path = generateStoragePath("user-123", "capture-456", "photo.jpg");
      assert.strictEqual(path, "user-123/capture-456/photo.jpg");
    });

    it("should sanitize malicious paths (directory traversal)", () => {
      assert.throws(
        () => generateStoragePath("user-123", "capture-456", "../photo.jpg"),
        /Invalid filename/,
      );
      assert.throws(
        () =>
          generateStoragePath("user-123", "capture-456", "folder/photo.jpg"),
        /Invalid filename/,
      );
    });

    it("should strip invalid characters from filename", () => {
      const path = generateStoragePath(
        "user-123",
        "capture-456",
        "photo @#$%^&.jpg",
      );
      assert.strictEqual(path, "user-123/capture-456/photo_______.jpg");
    });
  });

  describe("storageService", () => {
    it("should upload a file and return the path", async () => {
      const mockUpload = mock.fn(async () => ({
        data: { path: "user/capture/file.jpg" },
        error: null,
      }));
      const mockSupabase = {
        storage: {
          from: () => ({
            upload: mockUpload,
          }),
        },
      };

      mock.method(
        serverClient,
        "getSupabaseServerClient",
        async () => mockSupabase as unknown as SupabaseClient,
      );

      const path = await storageService.uploadFile(
        "user/capture/file.jpg",
        new Blob(["test"]),
        "image/jpeg",
      );
      assert.strictEqual(path, "user/capture/file.jpg");
      assert.strictEqual(mockUpload.mock.calls.length, 1);
    });

    it("should generate a signed URL", async () => {
      const mockCreateSignedUrl = mock.fn(async () => ({
        data: { signedUrl: "https://example.com/signed-url" },
        error: null,
      }));
      const mockSupabase = {
        storage: {
          from: () => ({
            createSignedUrl: mockCreateSignedUrl,
          }),
        },
      };

      mock.method(
        serverClient,
        "getSupabaseServerClient",
        async () => mockSupabase as unknown as SupabaseClient,
      );

      const url = await storageService.getSignedUrl("user/capture/file.jpg");
      assert.strictEqual(url, "https://example.com/signed-url");
      assert.strictEqual(mockCreateSignedUrl.mock.calls.length, 1);
    });

    it("should delete a file", async () => {
      const mockRemove = mock.fn(async () => ({
        data: {},
        error: null,
      }));
      const mockSupabase = {
        storage: {
          from: () => ({
            remove: mockRemove,
          }),
        },
      };

      mock.method(
        serverClient,
        "getSupabaseServerClient",
        async () => mockSupabase as unknown as SupabaseClient,
      );

      await storageService.deleteFile("user/capture/file.jpg");
      assert.strictEqual(mockRemove.mock.calls.length, 1);
    });

    it("should handle upload errors", async () => {
      const mockUpload = mock.fn(async () => ({
        data: null,
        error: new Error("Storage error"),
      }));
      const mockSupabase = {
        storage: {
          from: () => ({
            upload: mockUpload,
          }),
        },
      };

      mock.method(
        serverClient,
        "getSupabaseServerClient",
        async () => mockSupabase as unknown as SupabaseClient,
      );

      await assert.rejects(
        () =>
          storageService.uploadFile(
            "user/capture/file.jpg",
            new Blob(),
            "image/jpeg",
          ),
        /Failed to upload file: Storage error/,
      );
    });
  });
});
