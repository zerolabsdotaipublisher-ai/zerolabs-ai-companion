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
import { TimelineDetail } from "@/components/timeline/timeline-detail";
import { ClientTimelineDetail } from "@/lib/ai/types";

mock.module("next/navigation", {
  namedExports: {
    useRouter: () => ({
      refresh: () => {
        (
          globalThis as unknown as Record<string, boolean>
        ).__routerRefreshCalled = true;
      },
      push: (path: string) => {
        (globalThis as unknown as Record<string, string>).__routerPushPath =
          path;
      },
    }),
  },
});

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
    render(<TimelineDetail memory={mockMemoryBase} />);
    assert.ok(screen.getByText("Walked in the park."));
    assert.ok(screen.getByText(/Oct 24, 2023.*3:45 PM/));
  });

  it("renders memory with note, photo, and suggestion title", () => {
    const memoryWithExtras: ClientTimelineDetail = {
      ...mockMemoryBase,
      noteText: "It was very sunny today.",
      photoUrl: "https://example.com/photo.jpg",
      suggestionTitle: "Daily Walk",
      originType: "suggestion",
    };
    render(<TimelineDetail memory={memoryWithExtras} />);

    assert.ok(screen.getByText("Walked in the park."));
    assert.ok(screen.getByText("Daily Walk"));
    const img = screen.getByAltText("Memory attachment") as HTMLImageElement;
    assert.ok(img);
    assert.match(img.src, /photo\.jpg/);
    assert.ok(screen.getByText(/It was very sunny today\./));
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

    render(<TimelineDetail memory={mockMemoryBase} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const textarea = screen.getByTestId(
      "memory-edit-textarea",
    ) as HTMLTextAreaElement;
    assert.strictEqual(textarea.value, "Walked in the park.");

    fireEvent.change(textarea, { target: { value: "Updated summary text." } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
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
    assert.ok(screen.getByText("Updated summary text."));
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

    render(<TimelineDetail memory={mockMemoryBase} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
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

    render(<TimelineDetail memory={mockMemoryBase} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
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
    assert.ok(screen.getByText("Regenerated summary."));
  });
});
