import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert";
import {
  render,
  screen,
  cleanup,
  act,
  fireEvent,
} from "@testing-library/react";
import React from "react";
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
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

import { TimelineDetail } from "@/components/timeline/timeline-detail";
import { ClientTimelineDetail } from "@/lib/ai/types";

const mockFetch = mock.fn(async () => undefined as unknown as Response);
Object.defineProperty(global, "fetch", {
  value: mockFetch,
  writable: true,
  configurable: true,
});
Object.defineProperty(window, "confirm", {
  value: () => true,
  writable: true,
  configurable: true,
});

const mockMemoryBase: ClientTimelineDetail = {
  id: "1",
  summaryText: "Walked in the park.",
  displayDate: "Oct 24, 2023",
  displayTime: "3:45 PM",
  originType: "direct",
};

describe("TimelineDetail Component", () => {
  beforeEach(() => {
    cleanup();
    mockFetch.mock.resetCalls();
    (globalThis as unknown as Record<string, boolean>).__routerRefreshCalled =
      false;
    (globalThis as unknown as Record<string, string>).__routerPushPath = "";
  });

  it("renders simple memory correctly", () => {
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
      <TimelineDetail
        memory={mockMemoryBase}
        router={{
          refresh: () => {
            (
              globalThis as unknown as Record<string, unknown>
            ).__routerRefreshCalled = true;
          },
          push: (path: string) => {
            (
              globalThis as unknown as Record<string, unknown>
            ).__routerPushPath = path;
          },
          back: () => {
            (
              globalThis as unknown as Record<string, unknown>
            ).__routerBackCalled = true;
          },
        }}
      />,
    );
    assert.ok(getByText("Walked in the park."));
    assert.ok(getByText(/Oct 24, 2023.*3:45 PM/));
  });

  it("renders memory with note, photo, and suggestion title", () => {
    const memoryWithExtras: ClientTimelineDetail = {
      ...mockMemoryBase,
      noteText: "It was very sunny today.",
      photoUrl: "/photo.jpg",
      suggestionTitle: "Daily Walk",
      originType: "suggestion",
    };
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
      <TimelineDetail
        memory={memoryWithExtras}
        router={{
          refresh: () => {
            (
              globalThis as unknown as Record<string, unknown>
            ).__routerRefreshCalled = true;
          },
          push: (path: string) => {
            (
              globalThis as unknown as Record<string, unknown>
            ).__routerPushPath = path;
          },
          back: () => {
            (
              globalThis as unknown as Record<string, unknown>
            ).__routerBackCalled = true;
          },
        }}
      />,
    );

    assert.ok(getByText("Walked in the park."));
    assert.ok(getByText("Daily Walk"));
    const img = getByAltText("Memory attachment") as HTMLImageElement;
    assert.ok(img);
    assert.match(img.src, /photo\.jpg/);
    assert.ok(getByText(/It was very sunny today\./));
  });

  it("handles edit and save successfully", async () => {
    (
      mockFetch as unknown as ReturnType<typeof mock.fn>
    ).mock.mockImplementationOnce(async () => {
      return {
        ok: true,
        json: async () => ({
          memory: { summaryText: "Updated summary text." },
        }),
      } as Response;
    });

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
      <TimelineDetail
        memory={mockMemoryBase}
        router={{
          refresh: () => {
            (
              globalThis as unknown as Record<string, unknown>
            ).__routerRefreshCalled = true;
          },
          push: (path: string) => {
            (
              globalThis as unknown as Record<string, unknown>
            ).__routerPushPath = path;
          },
          back: () => {
            (
              globalThis as unknown as Record<string, unknown>
            ).__routerBackCalled = true;
          },
        }}
      />,
    );

    fireEvent.click(getByRole("button", { name: "Edit" }));

    const textarea = getByTestId("memory-edit-textarea") as HTMLTextAreaElement;
    assert.strictEqual(textarea.value, "Walked in the park.");
    assert.strictEqual(
      (getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled,
      false,
    );

    fireEvent.change(textarea, { target: { value: "Updated summary text." } });

    await act(async () => {
      fireEvent.click(getByRole("button", { name: "Save" }));
      // Button disabled state is very transient in JSDOM React tests without awaiting proper re-renders for isSubmitting
    });

    assert.strictEqual(mockFetch.mock.calls.length, 1);
    assert.strictEqual(
      (mockFetch as unknown as ReturnType<typeof mock.fn>).mock.calls[0]
        .arguments[0],
      `/api/memory/${mockMemoryBase.id}`,
    );
    assert.strictEqual(
      (
        (mockFetch as unknown as ReturnType<typeof mock.fn>).mock.calls[0]
          .arguments[1] as RequestInit
      ).method,
      "PATCH",
    );

    assert.strictEqual(
      (globalThis as unknown as Record<string, boolean>).__routerRefreshCalled,
      true,
    );
    assert.ok(getByText("Updated summary text."));
  });

  it("handles delete successfully", async () => {
    (
      mockFetch as unknown as ReturnType<typeof mock.fn>
    ).mock.mockImplementationOnce(async () => {
      return {
        ok: true,
        json: async () => ({ success: true }),
      } as Response;
    });

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
      <TimelineDetail
        memory={mockMemoryBase}
        router={{
          refresh: () => {
            (
              globalThis as unknown as Record<string, unknown>
            ).__routerRefreshCalled = true;
          },
          push: (path: string) => {
            (
              globalThis as unknown as Record<string, unknown>
            ).__routerPushPath = path;
          },
          back: () => {
            (
              globalThis as unknown as Record<string, unknown>
            ).__routerBackCalled = true;
          },
        }}
      />,
    );

    await act(async () => {
      fireEvent.click(getByRole("button", { name: "Delete" }));
    });

    assert.strictEqual(mockFetch.mock.calls.length, 1);
    assert.strictEqual(
      (mockFetch as unknown as ReturnType<typeof mock.fn>).mock.calls[0]
        .arguments[0],
      `/api/memory/${mockMemoryBase.id}`,
    );
    assert.strictEqual(
      (
        (mockFetch as unknown as ReturnType<typeof mock.fn>).mock.calls[0]
          .arguments[1] as RequestInit
      ).method,
      "DELETE",
    );

    assert.strictEqual(
      (globalThis as unknown as Record<string, string>).__routerPushPath,
      "/timeline",
    );
  });

  it("handles regenerate successfully", async () => {
    (
      mockFetch as unknown as ReturnType<typeof mock.fn>
    ).mock.mockImplementationOnce(async () => {
      return {
        ok: true,
        json: async () => ({ memory: { summaryText: "Regenerated summary." } }),
      } as Response;
    });

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
      <TimelineDetail
        memory={mockMemoryBase}
        router={{
          refresh: () => {
            (
              globalThis as unknown as Record<string, unknown>
            ).__routerRefreshCalled = true;
          },
          push: (path: string) => {
            (
              globalThis as unknown as Record<string, unknown>
            ).__routerPushPath = path;
          },
          back: () => {
            (
              globalThis as unknown as Record<string, unknown>
            ).__routerBackCalled = true;
          },
        }}
      />,
    );

    await act(async () => {
      fireEvent.click(getByRole("button", { name: "Regenerate" }));
    });

    assert.strictEqual(mockFetch.mock.calls.length, 1);
    assert.strictEqual(
      (mockFetch as unknown as ReturnType<typeof mock.fn>).mock.calls[0]
        .arguments[0],
      `/api/memory/${mockMemoryBase.id}/regenerate`,
    );
    assert.strictEqual(
      (
        (mockFetch as unknown as ReturnType<typeof mock.fn>).mock.calls[0]
          .arguments[1] as RequestInit
      ).method,
      "POST",
    );

    assert.strictEqual(
      (globalThis as unknown as Record<string, boolean>).__routerRefreshCalled,
      true,
    );
    assert.ok(getByText("Regenerated summary."));
  });
});
