import { test, describe, afterEach, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";
import React from "react";
import { render, act, screen } from "@testing-library/react";
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

describe("CaptureForm - Submission", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test("submits correctly for spontaneous capture (empty note)", async () => {
    const onSubmitMock = mock.fn();
    const { container } = render(
      <CaptureForm isSubmitting={false} onSubmit={onSubmitMock as any} />,
    );

    const submitButton = container.querySelector(
      '[data-testid="capture-submit-button"]',
    ) as HTMLButtonElement;

    const user = userEvent.setup({ document: dom.window.document });
    await act(async () => {
      await user.click(submitButton);
    });

    assert.strictEqual(onSubmitMock.mock.callCount(), 1);
    const callArgs = onSubmitMock.mock.calls[0].arguments[0];
    assert.deepStrictEqual(callArgs, {
      suggestionId: null,
      noteText: null,
      mediaMetadata: null,
    });
  });

  test("submits correctly for linked capture with note text", async () => {
    const onSubmitMock = mock.fn();
    const { container } = render(
      <CaptureForm
        suggestionId="123e4567-e89b-12d3-a456-426614174000"
        isSubmitting={false}
        onSubmit={onSubmitMock as any}
      />,
    );

    const textarea = container.querySelector(
      '[data-testid="capture-note-textarea"]',
    ) as HTMLTextAreaElement;

    const submitButton = container.querySelector(
      '[data-testid="capture-submit-button"]',
    ) as HTMLButtonElement;

    const user = userEvent.setup({ document: dom.window.document });
    await act(async () => {
      await user.type(textarea, "A quick brown fox");
      await user.click(submitButton);
    });

    assert.strictEqual(onSubmitMock.mock.callCount(), 1);
    const callArgs = onSubmitMock.mock.calls[0].arguments[0];
    assert.deepStrictEqual(callArgs, {
      suggestionId: "123e4567-e89b-12d3-a456-426614174000",
      noteText: "A quick brown fox",
      mediaMetadata: null,
    });
  });

  test("disables inputs when isSubmitting is true", async () => {
    const onSubmitMock = mock.fn();
    const { container } = render(
      <CaptureForm isSubmitting={true} onSubmit={onSubmitMock as any} />,
    );

    const textarea = container.querySelector(
      '[data-testid="capture-note-textarea"]',
    ) as HTMLTextAreaElement;

    const submitButton = container.querySelector(
      '[data-testid="capture-submit-button"]',
    ) as HTMLButtonElement;

    assert.strictEqual(textarea.disabled, true);
    assert.strictEqual(submitButton.disabled, true);
  });
});
