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
import { TimelineList } from "@/components/timeline/timeline-list";
import { TimelineError } from "@/components/timeline/timeline-error";
import { ClientTimelineItem } from "@/lib/ai/types";

mock.module("next/navigation", {
  namedExports: {
    useRouter: () => ({
      refresh: () => {
        (
          globalThis as unknown as Record<string, boolean>
        ).__routerRefreshCalled = true;
      },
    }),
  },
});

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
    photoUrl: "https://example.com/photo.jpg",
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
      render(<TimelineList memories={[]} />);
      const text = screen.getByText(
        /Your timeline will quietly collect moments/i,
      );
      assert.ok(text, "Empty state text should be visible");
    });

    it("should render memories correctly", () => {
      render(<TimelineList memories={mockMemories} />);

      const summary1 = screen.getByText("Walked in the park.");
      const summary2 = screen.getByText("Completed a focus session.");
      assert.ok(summary1);
      assert.ok(summary2);

      const dateText = screen.getByText(/Oct 24, 2023.*3:45 PM/i);
      assert.ok(dateText);

      const suggestionPill = screen.getByText("Deep Work");
      assert.ok(suggestionPill);
    });

    it("should render photo attachment if present", () => {
      render(<TimelineList memories={[mockMemories[1]]} />);

      const img = screen.getByAltText("Memory attachment") as HTMLImageElement;
      assert.ok(img);
      assert.match(img.src, /photo\.jpg/);
    });
  });

  describe("TimelineError", () => {
    it("renders correctly and handles retry click", async () => {
      (globalThis as unknown as Record<string, boolean>).__routerRefreshCalled =
        false;
      render(<TimelineError />);

      const msg = screen.getByText("We couldn't load your timeline right now.");
      assert.ok(msg);

      const btn = screen.getByRole("button", { name: /try again/i });

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
