import React from "react";
import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryEditForm } from "@/components/memory/MemoryEditForm";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost",
});

global.window = dom.window as unknown as Window & typeof globalThis;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

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
    render(<MemoryEditForm memoryId="mem-1" initialSummaryText="My memory" />);
    assert.ok(screen.getByText("My memory"));
    assert.ok(screen.getByText("Edit"));
    assert.ok(screen.getByText("Regenerate"));
    assert.ok(screen.getByText("Delete"));
  });

  it("enters edit mode and cancels correctly", () => {
    render(<MemoryEditForm memoryId="mem-1" initialSummaryText="My memory" />);

    // Click edit
    fireEvent.click(screen.getByText("Edit"));

    const textarea = screen.getByTestId(
      "memory-edit-textarea",
    ) as HTMLTextAreaElement;
    assert.ok(textarea);
    assert.equal(textarea.value, "My memory");

    // Type something
    fireEvent.change(textarea, { target: { value: "Updated memory" } });
    assert.equal(textarea.value, "Updated memory");

    // Click cancel
    fireEvent.click(screen.getByText("Cancel"));

    // Should be back in read-only with initial text
    assert.ok(screen.getByText("My memory"));
    assert.equal(screen.queryByTestId("memory-edit-textarea"), null);
  });

  it("validates summary length before saving", async () => {
    render(<MemoryEditForm memoryId="mem-1" initialSummaryText="My memory" />);

    fireEvent.click(screen.getByText("Edit"));
    const textarea = screen.getByTestId("memory-edit-textarea");

    // Try to save empty
    fireEvent.change(textarea, { target: { value: "" } });
    assert.ok((screen.getByText("Save") as HTMLButtonElement).disabled);
  });
});
