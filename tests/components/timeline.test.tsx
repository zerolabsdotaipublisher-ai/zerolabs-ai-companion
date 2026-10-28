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

import { TimelineList } from "@/components/timeline/timeline-list";
import { TimelineError } from "@/components/timeline/timeline-error";
import { ClientTimelineItem } from "@/lib/ai/types";

// Setup global fetch and standard JSDOM mocks for React tests
if (typeof global.matchMedia === "undefined") {
  global.matchMedia = () =>
    ({
      matches: false,
      addListener: () => {},
      removeListener: () => {},
    }) as unknown as MediaQueryList;
}

const mockMemories: ClientTimelineItem[] = [
  {
    id: "1",
    summaryText: "Walked in the park.",
    displayDate: "Oct 24, 2023",
    displayTime: "3:45 PM",
    originType: "direct",
  },
  {
    id: "2",
    summaryText: "Completed a focus session.",
    displayDate: "Oct 25, 2023",
    displayTime: "10:00 AM",
    photoUrl: "/photo.jpg",
    suggestionTitle: "Deep Work",
    originType: "suggestion",
  },
];

describe("Timeline Components", () => {
  beforeEach(() => {
    cleanup();
  });

  describe("TimelineList Rendering", () => {
    it("should render calm empty state when there are no memories", () => {
      const {
        getByText,
        getByAltText,
        queryByTestId,
        getAllByText,
        queryByText,
        getByPlaceholderText,
        getByRole,
        getByLabelText,
        container,
      } = render(
        <TimelineList
          initialData={{ items: [], hasMore: false, nextCursor: null }}
        />,
      );
      const text = getByText(/Your timeline will quietly collect moments/i);
      assert.ok(text, "Empty state text should be visible");
    });

    it("should render memories correctly", () => {
      const {
        getByText,
        getByAltText,
        queryByTestId,
        getAllByText,
        queryByText,
        getByPlaceholderText,
        getByRole,
        getByLabelText,
        container,
      } = render(
        <TimelineList
          initialData={{
            items: mockMemories,
            hasMore: false,
            nextCursor: null,
          }}
        />,
      );

      const summary1 = getByText("Walked in the park.");
      assert.equal(queryByTestId("suggestion-pill-1"), null); // Should be null for direct capture
      const summary2 = getByText("Completed a focus session.");
      assert.ok(summary1);
      assert.ok(summary2);

      const dateText = getByText(/Oct 24, 2023.*3:45 PM/i);
      assert.ok(dateText);

      const suggestionPill = getByText("Deep Work");
      assert.equal(suggestionPill.textContent, "Deep Work"); // Suggestion linked capture
      assert.ok(suggestionPill);
    });

    it("should render photo attachment if present", () => {
      const {
        getByText,
        getByAltText,
        queryByTestId,
        getAllByText,
        queryByText,
        getByPlaceholderText,
        getByRole,
        getByLabelText,
        container,
      } = render(
        <TimelineList
          initialData={{
            items: [mockMemories[1]],
            hasMore: false,
            nextCursor: null,
          }}
        />,
      );

      const img = getByAltText("Memory attachment") as HTMLImageElement;
      assert.ok(img);
      assert.match(img.src, /photo\.jpg/);
    });
  });

  describe("TimelineError", () => {
    it("renders correctly and handles retry click", async () => {
      (globalThis as unknown as Record<string, boolean>).__routerRefreshCalled =
        false;
      const {
        getByText,
        getByAltText,
        queryByTestId,
        getAllByText,
        queryByText,
        getByPlaceholderText,
        getByRole,
        getByLabelText,
        container,
      } = render(
        <TimelineError
          router={{
            refresh: () => {
              (
                globalThis as unknown as Record<string, boolean>
              ).__routerRefreshCalled = true;
            },
          }}
        />,
      );

      const msg = getByText("We couldn't load your timeline right now.");
      assert.ok(msg);

      const btn = getByRole("button", { name: /try again/i });

      act(() => {
        fireEvent.click(btn);
      });

      assert.strictEqual(
        (globalThis as unknown as Record<string, boolean>)
          .__routerRefreshCalled,
        true,
      );
    });
  });
});
