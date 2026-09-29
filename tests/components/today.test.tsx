import TodayPage from "../../src/app/(app)/today/page";
import { test, describe, afterEach, beforeEach } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";
import React from "react";
import { render, act, fireEvent, screen } from "@testing-library/react";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/",
});
global.window = dom.window as unknown as Window & typeof globalThis;
global.document = dom.window.document;

// Setup generic mock for requestAnimationFrame and matchMedia which might be needed
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

import { TodaySuggestionCard } from "../../src/components/today/today-suggestion-card";
import { TodayAlternatives } from "../../src/components/today/today-alternatives";
import { TodayActions } from "../../src/components/today/today-actions";
import { TodaySkeleton } from "../../src/components/today/today-skeleton";
import { TodayEmptyState } from "../../src/components/today/today-empty-state";
import { TodayRefinement } from "../../src/components/today/today-refinement";

describe("Today UI Components", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("TodaySuggestionCard renders correctly", () => {
    act(() => {
      render(
        <TodaySuggestionCard
          title="Take a 15-minute walk"
          duration="15m"
          tags={["outdoor", "mindful"]}
          rationale="You've been indoors all day."
        />,
      );
    });

    const titleElement = document.querySelector("h2");
    assert.strictEqual(titleElement?.textContent, "Take a 15-minute walk");

    const textContent = document.body.textContent || "";
    assert.ok(textContent.includes("15m"));
    assert.ok(textContent.includes("outdoor"));
    assert.ok(textContent.includes("mindful"));
    assert.ok(textContent.includes("You've been indoors all day."));
  });

  test("TodayAlternatives toggles correctly", () => {
    let selectedAlternative = "";
    act(() => {
      render(
        <TodayAlternatives
          alternatives={["Alternative 1", "Alternative 2"]}
          onSelectAlternative={(alt) => {
            selectedAlternative = alt;
          }}
        />,
      );
    });

    const toggleButton = document.querySelector("button");
    assert.strictEqual(toggleButton?.textContent, "Try another");

    // Initially alternatives are not shown
    assert.ok(!document.body.textContent?.includes("Alternative 1"));

    act(() => {
      toggleButton?.click();
    });

    assert.strictEqual(toggleButton?.textContent, "Hide alternatives");
    assert.ok(document.body.textContent?.includes("Alternative 1"));
    assert.ok(document.body.textContent?.includes("Alternative 2"));

    const altButtons = document.querySelectorAll("#alternatives-list button");
    assert.strictEqual(altButtons.length, 2);

    act(() => {
      (altButtons[0] as HTMLButtonElement).click();
    });

    assert.strictEqual(selectedAlternative, "Alternative 1");
  });

  test("TodayAlternatives handles disabled state correctly", () => {
    act(() => {
      render(
        <TodayAlternatives
          alternatives={["Alternative 1"]}
          onSelectAlternative={() => {}}
          isSubmitting={true}
        />,
      );
    });

    const toggleButton = document.querySelector("button");
    assert.strictEqual(toggleButton?.disabled, true);

    // We can't toggle it when disabled, but let's re-render it as open and disabled
    act(() => {
      document.body.innerHTML = "";
      render(
        <TodayAlternatives
          alternatives={["Alternative 1"]}
          onSelectAlternative={() => {}}
          isSubmitting={false}
        />,
      );
    });

    const newToggleButton = document.querySelector("button");
    act(() => {
      newToggleButton?.click();
    });

    // Now it's open, let's re-render with isSubmitting=true
    act(() => {
      document.body.innerHTML = "";
      render(
        <TodayAlternatives
          alternatives={["Alternative 1"]}
          onSelectAlternative={() => {}}
          isSubmitting={true}
        />,
      );
    });

    // Both toggle button and the list buttons should be disabled
    const allButtons = document.querySelectorAll("button");
    allButtons.forEach((btn) => {
      assert.strictEqual(btn.disabled, true);
    });
  });

  test("TodayActions callbacks and disabled state", () => {
    let accepted = false;
    let skipped = false;

    const { rerender } = render(
      <TodayActions
        onAccept={() => {
          accepted = true;
        }}
        onSkip={() => {
          skipped = true;
        }}
        isSubmitting={false}
      />,
    );

    const buttons = document.querySelectorAll("button");
    assert.strictEqual(buttons.length, 2);

    // buttons[0] is Skip, buttons[1] is Do it
    act(() => {
      buttons[0].click();
    });
    assert.strictEqual(skipped, true);

    act(() => {
      buttons[1].click();
    });
    assert.strictEqual(accepted, true);

    // Test disabled state
    act(() => {
      rerender(
        <TodayActions
          onAccept={() => {}}
          onSkip={() => {}}
          isSubmitting={true}
        />,
      );
    });

    const updatedButtons = document.querySelectorAll("button");
    assert.strictEqual(updatedButtons[0].disabled, true);
    assert.strictEqual(updatedButtons[1].disabled, true);
  });

  test("TodaySkeleton renders without crashing", () => {
    act(() => {
      render(<TodaySkeleton />);
    });
    const skeleton = document.querySelector('[role="status"]');
    assert.ok(skeleton !== null);
    assert.ok(skeleton?.classList.contains("animate-pulse"));
  });

  test("TodayEmptyState renders with default message", () => {
    act(() => {
      render(<TodayEmptyState />);
    });
    const heading = document.querySelector("h2");
    assert.strictEqual(heading?.textContent, "All Done");
    assert.ok(
      document.body.textContent?.includes(
        "You're all set for today. Enjoy the moment.",
      ),
    );
  });

  test("TodayRefinement handles UI interactions properly", async () => {
    let streamingState = false;

    // Instead of using screen which might be unbound in this JSDOM node:test setup,
    // we query the document.body directly.
    act(() => {
      render(
        <TodayRefinement
          suggestionContext={{ primarySuggestion: "Test" }}
          onStreamingChange={(s) => {
            streamingState = s;
          }}
        />,
      );
    });

    // Initial state: closed
    const buttons = document.querySelectorAll("button");
    const triggerBtn = Array.from(buttons).find(
      (b) => b.textContent === "Ask companion about this",
    );
    assert.ok(triggerBtn !== undefined);

    // Open refinement
    act(() => {
      triggerBtn!.click();
    });

    assert.ok(document.body.textContent?.includes("Refine Suggestion"));

    // Test text input
    const input = document.querySelector(
      "input[type='text']",
    ) as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: "Hello" } });
    });
    assert.strictEqual(input.value, "Hello");

    // Close refinement
    const updatedButtons = document.querySelectorAll("button");
    const closeBtn = Array.from(updatedButtons).find(
      (b) => b.textContent === "Close",
    );
    assert.ok(closeBtn !== undefined);

    act(() => {
      closeBtn!.click();
    });

    const finalButtons = document.querySelectorAll("button");
    const finalTriggerBtn = Array.from(finalButtons).find(
      (b) => b.textContent === "Ask companion about this",
    );
    assert.ok(finalTriggerBtn !== undefined);
  });
});

interface FetchMockCall {
  url?: string;
  options?: RequestInit;
}

describe("TodayPage Integration Tests", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    document.body.innerHTML = "";
  });

  test("TodayPage handles Accept correctly", async () => {
    let fetchCalledWith: FetchMockCall = {};
    global.fetch = async (url, options) => {
      fetchCalledWith = { url: url as string, options };
      return { ok: true, json: async () => ({}) } as Response;
    };

    act(() => {
      render(<TodayPage />);
    });

    // Wait for the mock 1s load
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1100));
    });

    const buttons = document.querySelectorAll("button");
    const acceptBtn = Array.from(buttons).find(
      (b) => b.textContent === "Do it",
    );

    assert.ok(acceptBtn !== undefined);

    await act(async () => {
      acceptBtn!.click();
    });

    assert.ok(fetchCalledWith.url !== undefined);
    assert.strictEqual(fetchCalledWith.url, "/api/ai/daily-suggestion/status");
    const body = JSON.parse(fetchCalledWith.options?.body as string);
    assert.strictEqual(body.status, "accepted");

    // UI should transition to empty state
    const heading = document.querySelector("h2");
    assert.strictEqual(heading?.textContent, "All Done");
  });

  test("TodayPage handles Skip correctly", async () => {
    let fetchCalledWith: FetchMockCall = {};
    global.fetch = async (url, options) => {
      fetchCalledWith = { url: url as string, options };
      return { ok: true, json: async () => ({}) } as Response;
    };

    act(() => {
      render(<TodayPage />);
    });

    // Wait for the mock 1s load
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1100));
    });

    const buttons = document.querySelectorAll("button");
    const skipBtn = Array.from(buttons).find((b) => b.textContent === "Skip");

    assert.ok(skipBtn !== undefined);

    await act(async () => {
      skipBtn!.click();
    });

    assert.ok(fetchCalledWith.url !== undefined);
    assert.strictEqual(fetchCalledWith.url, "/api/ai/daily-suggestion/status");
    const body = JSON.parse(fetchCalledWith.options?.body as string);
    assert.strictEqual(body.status, "skipped");

    // UI should transition to empty state
    const heading = document.querySelector("h2");
    assert.strictEqual(heading?.textContent, "All Done");
  });

  test("TodayPage handles Error State on failed status update", async () => {
    global.fetch = async () => {
      return { ok: false, json: async () => ({}) } as Response;
    };

    act(() => {
      render(<TodayPage />);
    });

    // Wait for the mock 1s load
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1100));
    });

    const buttons = document.querySelectorAll("button");
    const acceptBtn = Array.from(buttons).find(
      (b) => b.textContent === "Do it",
    );

    assert.ok(acceptBtn !== undefined);

    await act(async () => {
      acceptBtn!.click();
    });

    // UI should show error state
    const textContent = document.body.textContent || "";
    assert.ok(textContent.includes("Failed to load suggestion."));
  });

  test("TodayPage handles Conversational Refinement correctly", async () => {
    let fetchCalledWith: FetchMockCall = {};

    const mockStreamResponse = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices": [{"delta": {"content": "Hello"}}]}\n\n',
          ),
        );
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices": [{"delta": {"content": " world"}}]}\n\n',
          ),
        );
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    global.fetch = async (url, options) => {
      fetchCalledWith = { url: url as string, options };
      return {
        ok: true,
        body: mockStreamResponse,
      } as unknown as Response;
    };

    act(() => {
      render(<TodayPage />);
    });

    // Wait for the mock 1s load
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1100));
    });

    const buttons = document.querySelectorAll("button");
    const askBtn = Array.from(buttons).find(
      (b) => b.textContent === "Ask companion about this",
    );
    assert.ok(askBtn !== undefined);

    act(() => {
      askBtn!.click();
    });

    // We can click a predefined pill
    const predefinedBtn = document.querySelectorAll("button");
    const pillBtn = Array.from(predefinedBtn).find(
      (b) => b.textContent === "Something indoors instead?",
    );
    assert.ok(pillBtn !== undefined);

    await act(async () => {
      pillBtn!.click();
    });

    assert.ok(fetchCalledWith.url !== undefined);
    assert.strictEqual(fetchCalledWith.url, "/api/ai/conversation");
    const body = JSON.parse(fetchCalledWith.options?.body as string);
    assert.ok(body.suggestionContext !== undefined);
    assert.strictEqual(
      body.suggestionContext.primarySuggestion,
      "Take a 15-minute walk without your phone",
    );
    assert.strictEqual(body.messages.length, 1);
    assert.strictEqual(body.messages[0].content, "Something indoors instead?");
  });

  test("TodayPage handles Alternatives correctly", async () => {
    let fetchCalledWith: FetchMockCall = {};
    global.fetch = async (url, options) => {
      fetchCalledWith = { url: url as string, options };
      return { ok: true, json: async () => ({}) } as Response;
    };

    act(() => {
      render(<TodayPage />);
    });

    // Wait for the mock 1s load
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1100));
    });

    const buttons = document.querySelectorAll("button");
    const tryAnotherBtn = Array.from(buttons).find(
      (b) => b.textContent === "Try another",
    );

    assert.ok(tryAnotherBtn !== undefined);

    await act(async () => {
      tryAnotherBtn!.click();
    });

    const altButtons = document.querySelectorAll("#alternatives-list button");

    await act(async () => {
      (altButtons[0] as HTMLButtonElement).click();
    });

    assert.ok(fetchCalledWith.url !== undefined);
    assert.strictEqual(fetchCalledWith.url, "/api/ai/daily-suggestion/status");
    const body = JSON.parse(fetchCalledWith.options?.body as string);
    assert.strictEqual(body.status, "alternative_requested");

    // Primary suggestion text should be updated
    const titleElement = document.querySelector("h2");
    assert.strictEqual(
      titleElement?.textContent,
      "Stretch by the window for 5 minutes.",
    );
  });
});
