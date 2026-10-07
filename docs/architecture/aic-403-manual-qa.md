# AIC-403 Manual QA Scenarios for Experience Capture Workflow

## 1. Initial State & Hydration

- **Scenario:** Navigate to `/capture` directly without any query parameters.
- **Expected:** The page should cleanly render the `CaptureForm` with a textarea for notes (max 1,000 characters) and a "Done" button. The title should not show suggestion context. No horizontal scrolling should be possible.

## 2. Suggestion-Linked Capture Handoff

- **Scenario A:** Navigate to `/today`, select "Do it" for a suggestion. Navigate to `/capture?suggestionId=uuid-1234&suggestionContext=Take%20a%20walk`.
- **Expected:** The page should display the suggestion context in the `CaptureHeader`. The `CaptureForm` should be rendered.

## 3. Action Mutations

- **Scenario A (Spontaneous Capture):** Navigate to `/capture`. Enter some text (or leave it empty) and click "Done".
  - **Expected:** The form successfully submits. The submit button is locked (`isSubmitting=true`). A success state (e.g. `CaptureSaveState`) is shown afterwards.
- **Scenario B (Suggestion-Linked Capture):** Navigate to `/capture?suggestionId=6fa36e8b-a459-42b7-87bb-b9b5f5431633`. Enter text and click "Done".
  - **Expected:** The form submits with the `suggestionId` payload. The UI shows the success state.

## 4. Text Length Boundaries

- **Scenario:** Navigate to `/capture`. Attempt to enter more than 1,000 characters into the text area.
- **Expected:** The textarea visually enforces the 1,000 character limit. The counter updates correctly. Submitting with more than 1,000 characters via API should return a validation error.

## 5. Duplicate Submission Prevention

- **Scenario:** Navigate to `/capture`. Quickly double-click the "Done" button.
- **Expected:** The form submits only once. The `isSubmitting` state locks the button to prevent duplicate dispatches.

## 6. Mobile Layout Scaling

- **Scenario:** View the `/capture` page on a mobile device or using Chrome DevTools set to a 375px width (e.g., iPhone SE).
- **Expected:** The layout scales cleanly. No horizontal scroll overflow occurs. Buttons and interactive elements are thumb-friendly (min 44x44px). The virtual keyboard does not cut off the UI (due to `h-[100dvh]` or similar handling).

## 7. Error Recovery

- **Scenario:** Block network requests to `/api/capture` (using DevTools Network tab) and click "Done".
- **Expected:** The page does not crash. An inline, non-intrusive error banner appears indicating the failure ("Unable to save experience. Please try again.") with a "Dismiss" button. The rest of the page remains intact.
