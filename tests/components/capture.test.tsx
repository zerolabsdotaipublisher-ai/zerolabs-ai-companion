import { test, describe, afterEach, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";
import React from "react";
import { render, act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

import { CaptureForm } from "../../src/components/capture/capture-form";

describe("CaptureForm - Basics", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test("renders capture form and textarea correctly", async () => {
    const onSubmitMock = mock.fn();
    const { container } = render(
      <CaptureForm
        isSubmitting={false}
        onSubmit={onSubmitMock as any}
      />
    );

    const textarea = container.querySelector(
      '[data-testid="capture-note-textarea"]'
    ) as HTMLTextAreaElement;
    assert.ok(textarea, "Textarea should be rendered");
    assert.strictEqual(
      textarea.placeholder,
      "Add a short note or reflection... (Optional)"
    );

    const submitButton = container.querySelector(
      '[data-testid="capture-submit-button"]'
    ) as HTMLButtonElement;
    assert.ok(submitButton, "Submit button should be rendered");
    assert.strictEqual(submitButton.textContent, "Done");
  });

  test("handles text input and enforces length bounds visually", async () => {
    const onSubmitMock = mock.fn();
    const { container } = render(
      <CaptureForm
        isSubmitting={false}
        onSubmit={onSubmitMock as any}
      />
    );

    const textarea = container.querySelector(
      '[data-testid="capture-note-textarea"]'
    ) as HTMLTextAreaElement;

    const user = userEvent.setup({ document: dom.window.document });
    await act(async () => {
      await user.type(textarea, "A new experience");
    });

    assert.strictEqual(textarea.value, "A new experience");
    assert.strictEqual(textarea.maxLength, 1000);

    const counter = container.querySelector(".absolute.bottom-3");
    assert.ok(counter?.textContent?.includes("16/1000"), "Counter should show 16/1000: " + counter?.textContent);
  });
});
