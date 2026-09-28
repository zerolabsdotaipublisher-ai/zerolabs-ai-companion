import { test, describe, afterEach } from "node:test";
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
});
