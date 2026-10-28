import "server-only";

import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { POST } from "../../../src/app/api/capture/upload/route";
import { storageService } from "../../../src/lib/storage/storage-service";
import * as serverClient from "../../../src/lib/supabase/server";

describe("Upload Route", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: mock.fn(async () => ({
          data: { user: { id: "user-1" } },
          error: null,
        })),
      },
      storage: {
        from: mock.fn(() => ({
          upload: mock.fn(async () => ({
            data: { path: "user-1/capture-1/photo.jpg" },
            error: null,
          })),
        })),
      },
    };
    mock.method(
      serverClient,
      "getSupabaseServerClient",
      async () => mockSupabase,
    );
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("returns 401 if user is unauthorized", async () => {
    mockSupabase.auth.getUser.mock.mockImplementationOnce(async () => ({
      data: { user: null },
      error: new Error("Unauthorized"),
    }));
    const req = new Request("http://localhost/api/capture/upload", {
      method: "POST",
    });
    const res = await POST(req);
    assert.strictEqual(res.status, 401);
  });

  it("returns 400 if missing file or captureId", async () => {
    const formData = new FormData();
    const req = new Request("http://localhost/api/capture/upload", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    assert.strictEqual(res.status, 400);
  });

  it("returns 400 for invalid file constraints", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob(["test"], { type: "application/pdf" }),
      "test.pdf",
    );
    formData.append("captureId", "capture-1");
    const req = new Request("http://localhost/api/capture/upload", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    assert.strictEqual(res.status, 400);
  });

  it("uploads file and returns mediaMetadata on success", async () => {
    const formData = new FormData();
    const file = new File(["test image"], "photo.jpg", { type: "image/jpeg" });
    formData.append("file", file);
    formData.append("captureId", "capture-1");

    const req = new Request("http://localhost/api/capture/upload", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    assert.strictEqual(res.status, 201);

    const json = await res.json();
    assert.ok(json.mediaMetadata);
    assert.strictEqual(json.mediaMetadata.mimeType, "image/jpeg");
    assert.strictEqual(
      json.mediaMetadata.storagePath,
      "user-1/capture-1/photo.jpg",
    );
    assert.ok(json.mediaMetadata.uploadedAt);
  });

  it("returns 500 on upload failure", async () => {
    mock.method(storageService, "uploadFile", async () => {
      throw new Error("Storage Error");
    });

    const formData = new FormData();
    formData.append(
      "file",
      new File(["test"], "photo.jpg", { type: "image/jpeg" }),
    );
    formData.append("captureId", "capture-1");
    const req = new Request("http://localhost/api/capture/upload", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    assert.strictEqual(res.status, 500);
  });
});
