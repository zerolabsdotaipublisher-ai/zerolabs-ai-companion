# AIC-404 Manual QA Scenarios for Photo and Media Capture Workflow

## 1. Initial State & Basic UI

- **Scenario A (Voluntary Capture):** Navigate to `/capture` without query parameters.
- **Expected:** The `CaptureForm` renders with a note textarea and a "Done" button. The photo selection button ("Add a photo" or similar) is visible. The capture can be submitted with just text and no photo (mediaMetadata should be null).

## 2. Photo Selection & Preview Controls

- **Scenario B (Photo Pre-save UI):** On `/capture`, tap the photo selection button and choose a valid image file (<10MB JPEG/PNG/WebP).
- **Expected:** A pre-save image preview of the selected photo is rendered. "Remove" and "Replace" buttons appear. Tapping "Remove" clears the preview and restores the original "Add a photo" state. Tapping "Replace" allows selecting a new file.

## 3. Upload & Submission Workflow

- **Scenario C (Upload & Submit):** With a valid photo selected and an optional text note, tap the "Done" button.
- **Expected:** The form locks (`isSubmitting=true`, buttons disabled). The photo uploads successfully. The capture is submitted with `mediaMetadata` (containing `storagePath`, `mimeType`, `fileSizeBytes`, `uploadedAt`). The UI transitions to the saved capture view, displaying the attached photo securely via a short-lived signed URL.

## 4. File Constraint Validations

- **Scenario D (Invalid Files):** On `/capture`, attempt to upload an oversized file (>10MB) or an unsupported MIME type (e.g., a PDF or GIF).
- **Expected:** The selection is rejected. An inline, non-destructive error banner appears (e.g., "File too large" or "Unsupported file type"). The note text is preserved. The page does not crash.

## 5. Mobile Layout Scaling

- **Scenario E (Mobile Layout):** View the `/capture` page on a mobile device or using Chrome DevTools set to a 375px width (e.g., iPhone SE).
- **Expected:** The layout scales cleanly. No horizontal scroll overflow occurs. Buttons and interactive elements are thumb-friendly (min 44x44px). The virtual keyboard does not cut off the UI (dynamic viewport height `min-h-[100dvh]` or similar is used).

## 6. Error Recovery

- **Scenario F (Network/Storage Failure):** With a photo selected, block network requests to `/api/capture/upload` or `/api/capture` and tap "Done".
- **Expected:** The page does not crash. An inline error banner appears indicating the failure (e.g., "Failed to save experience") with a "Dismiss" or "Retry" option. The drafted note and selected photo remain intact for the user to retry.

## 7. Multi-tenant Data Isolation

- **Scenario G (Storage RLS Verification):** Authenticated as User A, attempt to query or access a storage object or database capture row belonging to User B using direct API or signed URL manipulation.
- **Expected:** The system strictly rejects access. Supabase RLS enforces `auth.uid() = user_id`, returning an error or null/not found. Zero raw DB keys, UUIDs, or timestamps from other users leak.
