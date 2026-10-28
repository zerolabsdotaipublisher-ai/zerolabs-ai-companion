import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
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

import {
  render,
  screen,
  fireEvent,
  act,
  cleanup,
} from "@testing-library/react";
import { TimelineList } from "@/components/timeline/timeline-list";
import { ClientTimelineItem } from "@/lib/ai/types";

// Setup global matchMedia
if (typeof global.matchMedia === "undefined") {
  global.matchMedia = () =>
    ({
      matches: false,
      addListener: () => {},
      removeListener: () => {},
    }) as unknown as MediaQueryList;
}

const mockInitialItems: ClientTimelineItem[] = [
  {
    id: "mem1",
    summaryText: "Initial memory 1",
    displayDate: "Oct 24, 2023",
    displayTime: "10:00 AM",
    originType: "direct",
  },
  {
    id: "mem2",
    summaryText: "Initial memory 2",
    displayDate: "Oct 24, 2023",
    displayTime: "9:00 AM",
    originType: "suggestion",
    suggestionTitle: "Test suggestion",
  },
];

const mockMoreItems: ClientTimelineItem[] = [
  {
    id: "mem2", // Intentional duplicate to test deduplication
    summaryText: "Initial memory 2",
    displayDate: "Oct 24, 2023",
    displayTime: "9:00 AM",
    originType: "suggestion",
  },
  {
    id: "mem3",
    summaryText: "Older memory 3",
    displayDate: "Oct 23, 2023",
    displayTime: "8:00 PM",
    originType: "direct",
  },
];

describe("Timeline Pagination", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    cleanup();
  });

  it("renders initial items and Load More button when hasMore is true", () => {
    const {
      getByText,
      getAllByText,
      queryByText,
      getByPlaceholderText,
      getByRole,
      getByLabelText,
      container,
    } = render(
      <TimelineList
        initialData={{
          items: mockInitialItems,
          nextCursor: "cursor_123",
          hasMore: true,
        }}
      />,
    );

    assert.ok(getByText("Initial memory 1"));
    assert.ok(getByText("Initial memory 2"));
    assert.ok(getByText("Load More"));
  });

  it("fetches more items, appends them chronologically, and deduplicates", async () => {
    const fetchMock = mock.fn(async (url: unknown) => {
      if (typeof url === "string" && url.includes("/api/timeline")) {
        return {
          ok: true,
          json: async () => ({
            items: mockMoreItems,
            nextCursor: null,
            hasMore: false,
          }),
        };
      }
      return { ok: false };
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const {
      getByText,
      getAllByText,
      queryByText,
      getByPlaceholderText,
      getByRole,
      getByLabelText,
      container,
    } = render(
      <TimelineList
        initialData={{
          items: mockInitialItems,
          nextCursor: "cursor_123",
          hasMore: true,
        }}
      />,
    );

    const loadMoreBtn = getByText("Load More");

    await act(async () => {
      fireEvent.click(loadMoreBtn);
    });

    assert.strictEqual(fetchMock.mock.callCount(), 1);

    assert.ok(getByText("Initial memory 1"));
    assert.ok(getByText("Older memory 3"));

    const mem2Elements = getAllByText("Initial memory 2");
    assert.strictEqual(mem2Elements.length, 1);

    assert.ok(getByText("You're all caught up with your memories."));
  });

  it("locks controls and shows skeleton during fetch", async () => {
    let resolveFetch: (val: unknown) => void;
    const promise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    const fetchMock = mock.fn(async () => {
      return promise;
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const {
      getByText,
      getAllByText,
      queryByText,
      getByPlaceholderText,
      getByRole,
      getByLabelText,
      container,
    } = render(
      <TimelineList
        initialData={{
          items: mockInitialItems,
          nextCursor: "cursor_123",
          hasMore: true,
        }}
      />,
    );

    const loadMoreBtn = getByText("Load More") as HTMLButtonElement;

    await act(async () => {
      fireEvent.click(loadMoreBtn);
    });

    assert.strictEqual(loadMoreBtn.disabled, true); // Assert in-flight state locking

    const skeletons = container.querySelectorAll(".animate-pulse");
    assert.ok(skeletons.length > 0);

    await act(async () => {
      resolveFetch({
        ok: true,
        json: async () => ({
          items: [],
          nextCursor: null,
          hasMore: false,
        }),
      });
    });
  });

  it("displays error banner and preserves items on failure", async () => {
    const fetchMock = mock.fn(async () => {
      return {
        ok: false,
      };
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const {
      getByText,
      getAllByText,
      queryByText,
      getByPlaceholderText,
      getByRole,
      getByLabelText,
      container,
    } = render(
      <TimelineList
        initialData={{
          items: mockInitialItems,
          nextCursor: "cursor_123",
          hasMore: true,
        }}
      />,
    );

    const loadMoreBtn = getByText("Load More");

    await act(async () => {
      fireEvent.click(loadMoreBtn);
    });

    assert.ok(getByText("Failed to load more memories"));
    assert.ok(getByText("Retry"));
    assert.ok(getByText("Initial memory 1"));
  });
});
