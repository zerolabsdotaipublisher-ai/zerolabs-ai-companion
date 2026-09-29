# AIC-402 Manual QA Scenarios for `/today` Experience

## 1. Initial State & Hydration

- **Scenario:** Navigate to `/today`.
- **Expected:** The page should display a calm, pulsing skeleton loader initially. Once loaded, it should cleanly render the primary suggestion card with a bold title, duration badge, category pills, and supporting rationale. No horizontal scrolling should be possible.

## 2. Alternatives Toggling

- **Scenario:** Click the "Try another" button under the primary suggestion.
- **Expected:** The UI should smoothly transition to show 1-2 alternative options. The button text should change to "Hide alternatives". Clicking an alternative should swap it into the primary suggestion view.

## 3. Action Mutations

- **Scenario A (Do it):** Click the "Do it" button.
  - **Expected:** The status updates to `accepted`, buttons become disabled (state locking), and the UI gracefully transitions to an "All Done" empty state placeholder.
- **Scenario B (Skip):** Click the "Skip" button.
  - **Expected:** The status updates to `skipped`, with zero guilt messaging, transitioning to the "All Done" resting state.
- **Scenario C (Try another selection):** Click "Try another" and select an alternative.
  - **Expected:** The status updates to `alternative_requested`, replacing the primary suggestion and keeping the user engaged without leaving the page.

## 4. In-context Refinement Streaming

- **Scenario:** Click the "Ask companion about this" button, then type a refinement question (e.g. "Something shorter?") or click a predefined pill, and submit.
- **Expected:** The refinement UI appears inline without navigating away. A streaming response from the AI companion answers the user's question with the context of the active daily suggestion preserved. The user should be able to stop the stream using a stop button, and the input should remain disabled during streaming.

## 5. Mobile Layout Scaling

- **Scenario:** View the `/today` page on a mobile device or using Chrome DevTools set to a 375px width (e.g., iPhone SE).
- **Expected:** The layout scales cleanly. No horizontal scroll overflow occurs. Buttons and interactive elements are thumb-friendly (min 44x44px). The virtual keyboard does not cut off the UI (due to `h-[100dvh]`).

## 6. Error Recovery

- **Scenario:** Block network requests to `/api/ai/daily-suggestion/status` (using DevTools Network tab) and click "Do it" or "Skip".
- **Expected:** The page does not crash. An inline, non-intrusive error boundary banner appears indicating the failure, with a subtle "Retry" trigger. The rest of the page remains intact.
