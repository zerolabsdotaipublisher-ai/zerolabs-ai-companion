import React from "react";
import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryEditForm } from "@/components/memory/MemoryEditForm";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost",
});

global.window = dom.window as unknown as Window & typeof globalThis;
(globalThis as unknown as Record<string, unknown>).self = global.window;
global.document = dom.window.document;
Object.defineProperty(global, "navigator", {
  value: dom.window.navigator,
  writable: true,
  configurable: true,
});

mock.method(global, "fetch");

describe("MemoryEditForm", () => {
  beforeEach(() => {
    (
      global.fetch as unknown as ReturnType<typeof mock.fn>
    ).mock?.resetCalls?.();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("renders initial read-only state correctly", () => {
    const {
      getByText,
      getByAltText,
      queryByTestId,
      getAllByText,
      queryByText,
      getByTestId,
      getByPlaceholderText,
      getByRole,
      getByLabelText,
      container,
    } = render(
      <MemoryEditForm
        router={{
          refresh: () => {
            (
              globalThis as unknown as Record<string, boolean>
            ).__routerRefreshCalled = true;
          },
        }}
        memoryId="mem-1"
        initialSummaryText="My memory"
      />,
    );
    assert.ok(getByText("My memory"));
    assert.ok(getByText("Edit"));
    assert.ok(getByText("Regenerate"));
    assert.ok(getByText("Delete"));
  });

  it("enters edit mode and cancels correctly", () => {
    const {
      getByText,
      getByAltText,
      queryByTestId,
      getAllByText,
      queryByText,
      getByTestId,
      getByPlaceholderText,
      getByRole,
      getByLabelText,
      container,
    } = render(
      <MemoryEditForm
        router={{
          refresh: () => {
            (
              globalThis as unknown as Record<string, boolean>
            ).__routerRefreshCalled = true;
          },
        }}
        memoryId="mem-1"
        initialSummaryText="My memory"
      />,
    );

    // Click edit
    fireEvent.click(getByText("Edit"));

    const textarea = getByTestId("memory-edit-textarea") as HTMLTextAreaElement;
    assert.ok(textarea);
    assert.equal(textarea.value, "My memory");

    // Type something
    fireEvent.change(textarea, { target: { value: "Updated memory" } });
    assert.equal(textarea.value, "Updated memory");

    // Click cancel
    fireEvent.click(getByText("Cancel"));

    // Should be back in read-only with initial text
    assert.ok(getByText("My memory"));
    assert.equal(queryByTestId("memory-edit-textarea"), null);
  });

  it("validates summary length before saving", async () => {
    const {
      getByText,
      getByAltText,
      queryByTestId,
      getAllByText,
      queryByText,
      getByTestId,
      getByPlaceholderText,
      getByRole,
      getByLabelText,
      container,
    } = render(
      <MemoryEditForm
        router={{
          refresh: () => {
            (
              globalThis as unknown as Record<string, boolean>
            ).__routerRefreshCalled = true;
          },
        }}
        memoryId="mem-1"
        initialSummaryText="My memory"
      />,
    );

    fireEvent.click(getByText("Edit"));
    const textarea = getByTestId("memory-edit-textarea") as HTMLTextAreaElement;

    // Try to save empty
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "" } });
    });
    // check textarea value
    assert.strictEqual(textarea.value, "");
    assert.strictEqual((getByText("Save") as HTMLButtonElement).disabled, true);
  });
});
