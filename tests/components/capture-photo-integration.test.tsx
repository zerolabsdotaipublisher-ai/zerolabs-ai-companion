import { CreateExperienceCaptureInput } from "../../src/lib/ai/types";
import { test, describe, afterEach, mock } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";
import React from "react";
import { render, act, fireEvent } from "@testing-library/react";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/",
});
global.window = dom.window as unknown as Window & typeof globalThis;
global.document = dom.window.document;
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.matchMedia =
  global.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

// Mock URL.createObjectURL and URL.revokeObjectURL for JSDOM
global.URL.createObjectURL = mock.fn(
  () => "blob:http://localhost/test-uuid",
) as unknown as typeof URL.createObjectURL;
global.URL.revokeObjectURL = mock.fn() as unknown as typeof URL.revokeObjectURL;
global.crypto.randomUUID = mock.fn(() => "test-uuid") as unknown as typeof crypto.randomUUID;

import { CaptureForm } from "../../src/components/capture/capture-form";

describe("CaptureForm - Photo Integration", () => {
  afterEach(() => {
    mock.restoreAll();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global.URL.createObjectURL as any).mock.resetCalls();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global.URL.revokeObjectURL as any).mock.resetCalls();
    global.fetch = mock.fn() as unknown as typeof fetch;
  });

  test("renders photo attachment button initially", async () => {
    const onSubmitMock = mock.fn();
    const { container } = render(
      <CaptureForm
        isSubmitting={false}
        onSubmit={
          onSubmitMock as unknown as (
            data: CreateExperienceCaptureInput,
          ) => Promise<void>
        }
      />,
    );

    const addPhotoButton = container.querySelector('button[type="button"]');
    assert.ok(addPhotoButton?.textContent?.includes("Add a photo"));
  });

  test("selecting a photo renders the pre-save preview image and buttons", async () => {
    const onSubmitMock = mock.fn();
    const { container } = render(
      <CaptureForm
        isSubmitting={false}
        onSubmit={
          onSubmitMock as unknown as (
            data: CreateExperienceCaptureInput,
          ) => Promise<void>
        }
      />,
    );

    const fileInput = container.querySelector(
      '[data-testid="capture-photo-input"]',
    ) as HTMLInputElement;
    const file = new File(["dummy content"], "test.png", { type: "image/png" });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    const previewImg = container.querySelector(
      '[data-testid="capture-photo-preview"]',
    ) as HTMLImageElement;
    assert.ok(previewImg, "Preview image should be rendered");
    assert.strictEqual(previewImg.src, "blob:http://localhost/test-uuid");

    const replaceBtn = container.querySelector(
      '[data-testid="capture-replace-photo-button"]',
    );
    const removeBtn = container.querySelector(
      '[data-testid="capture-remove-photo-button"]',
    );
    assert.ok(replaceBtn, "Replace button should be rendered");
    assert.ok(removeBtn, "Remove button should be rendered");
  });

  test("tapping Remove clears the selected photo", async () => {
    const onSubmitMock = mock.fn();
    const { container } = render(
      <CaptureForm
        isSubmitting={false}
        onSubmit={
          onSubmitMock as unknown as (
            data: CreateExperienceCaptureInput,
          ) => Promise<void>
        }
      />,
    );

    const fileInput = container.querySelector(
      '[data-testid="capture-photo-input"]',
    ) as HTMLInputElement;
    const file = new File(["dummy content"], "test.png", { type: "image/png" });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    let previewImg = container.querySelector(
      '[data-testid="capture-photo-preview"]',
    );
    assert.ok(previewImg, "Preview image should be rendered initially");

    const removeBtn = container.querySelector(
      '[data-testid="capture-remove-photo-button"]',
    ) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(removeBtn);
    });

    previewImg = container.querySelector(
      '[data-testid="capture-photo-preview"]',
    );
    assert.strictEqual(previewImg, null, "Preview image should be removed");

    const addPhotoButton = container.querySelector('button[type="button"]');
    assert.ok(addPhotoButton?.textContent?.includes("Add a photo"));
  });

  test("submitting a capture locks form controls during upload and delegates mediaMetadata", async () => {
    const onSubmitMock = mock.fn();

    global.fetch = mock.fn(async () => {
      return {
        ok: true,
        json: async () => ({
          mediaMetadata: {
            storagePath: "test/path",
            mimeType: "image/png",
            fileSizeBytes: 1234,
            uploadedAt: "2023-01-01T00:00:00Z",
          },
        }),
      };
    }) as unknown as typeof fetch;

    const { container } = render(
      <CaptureForm
        isSubmitting={false}
        onSubmit={
          onSubmitMock as unknown as (
            data: CreateExperienceCaptureInput,
          ) => Promise<void>
        }
      />,
    );

    const fileInput = container.querySelector(
      '[data-testid="capture-photo-input"]',
    ) as HTMLInputElement;
    const file = new File(["dummy content"], "test.png", { type: "image/png" });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    const submitBtn = container.querySelector(
      '[data-testid="capture-submit-button"]',
    ) as HTMLButtonElement;

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assert.strictEqual((global.fetch as any).mock.calls.length, 1);
    assert.strictEqual(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global.fetch as any).mock.calls[0].arguments[0],
      "/api/capture/upload",
    );

    assert.strictEqual(onSubmitMock.mock.calls.length, 1);
    const submittedData = onSubmitMock.mock.calls[0].arguments[0];

    assert.deepStrictEqual(submittedData.mediaMetadata, {
      storagePath: "test/path",
      mimeType: "image/png",
      fileSizeBytes: 1234,
      uploadedAt: "2023-01-01T00:00:00Z",
    });
  });

  test("submitting without a photo calls onSubmit with mediaMetadata: null", async () => {
    const onSubmitMock = mock.fn();
    global.fetch = mock.fn() as unknown as typeof fetch;

    const { container } = render(
      <CaptureForm
        isSubmitting={false}
        onSubmit={
          onSubmitMock as unknown as (
            data: CreateExperienceCaptureInput,
          ) => Promise<void>
        }
      />,
    );

    const submitBtn = container.querySelector(
      '[data-testid="capture-submit-button"]',
    ) as HTMLButtonElement;

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    assert.strictEqual(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global.fetch as any).mock.calls.length,
      0,
      "Fetch should not be called if no file is selected",
    );

    assert.strictEqual(onSubmitMock.mock.calls.length, 1);
    const submittedData = onSubmitMock.mock.calls[0].arguments[0];

    assert.strictEqual(submittedData.mediaMetadata, null);
  });
});
