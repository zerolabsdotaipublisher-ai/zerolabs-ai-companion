# Media Attachment Architecture Design

## 1. Overview & Product Loop Role

The media attachment system integrates tightly into the AI Companion's action-first daily loop: **Understand User -> Suggest -> Act -> Capture -> Generate Memory -> Timeline**.

Aligning strictly with the "Quiet Companion" ethos, photo attachments serve purely as lightweight visual evidence of a captured experience. The primary design philosophies for media are:

- **100% Optional:** Users are never forced to upload a photo to capture an experience.
- **Frictionless Experience:** Zero complex photo editing forms, mandatory uploads, or social media mechanics (likes, sharing, feeds).
- **MVP Focus (Photos Only):** For the MVP phase, only standard image formats are supported. Voice notes, video, and audio processing are explicitly deferred to ensure a minimalist, stable release.

## 2. Canonical Media Metadata Schema & Capture Relationship

To maintain a flexible and lightweight data model, media metadata is stored as a structured JSONB object (`media_metadata`) on the `captures` table (specifically the `ExperienceCapture` entity). This avoids complex relational joins for the MVP while preparing for future scalability.

### TypeScript Interfaces & Zod Validation

```typescript
import { z } from "zod";

// Canonical metadata payload matching the media_metadata JSONB column on captures
export const MediaMetadataSchema = z.object({
  storagePath: z
    .string()
    .min(1)
    .describe("e.g., {user_id}/{capture_id}/{filename.ext}"),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  fileSizeBytes: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024, "File size must be <= 10MB"),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  uploadedAt: z.string().datetime(),
});

export type MediaMetadata = z.infer<typeof MediaMetadataSchema>;

// Input validation model for creating a new media attachment
export const CreateMediaAttachmentInputSchema = z.object({
  file: z.any().describe("Raw File/Blob object from the client"),
  captureId: z.string().uuid(),
});

export type CreateMediaAttachmentInput = z.infer<
  typeof CreateMediaAttachmentInputSchema
>;

// Sanitized client-facing view model
export type ClientMediaAttachment = Omit<MediaMetadata, "storagePath"> & {
  url: string; // The short-lived signed URL for rendering
};
```

### Capture-Media Entity Relationship

The `media_metadata` field is optionally attached to `captures` table records as a JSONB column. This structure allows a capture to be fully independent, yet capable of housing rich visual data without requiring a separate `media` database table and foreign key constraints in the MVP.

## 3. Storage Architecture, Pathing & Row Level Security (RLS)

The MVP will utilize Supabase Storage for direct integration, ensuring secure and isolated media persistence.

### User-Isolated Storage Pathing

All files will be stored using a strictly enforced, user-isolated pathing convention:
`{user_id}/{capture_id}/{filename.ext}`

### Supabase Storage RLS Policies

The storage bucket will be private-by-default. Row Level Security (RLS) policies will enforce isolation at the database layer, restricting `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operations strictly to the authenticated user owning the file:
`auth.uid() = user_id`

### Signed URL / Secure Retrieval Strategy

Client rendering will rely entirely on short-lived signed URLs generated on the server. The raw bucket path (`storagePath`) will never be exposed to the client; instead, the server will translate the internal path into a temporary signed URL before sending the sanitized `ClientMediaAttachment` payload.

## 4. File Constraints, Validation & Security Boundaries

To protect the platform and ensure optimal performance, robust constraints and validation mechanisms will be implemented.

### Constraints

- **MIME Types:** Restricted to `image/jpeg`, `image/png`, and `image/webp`.
- **File Size Limits:** Maximum 10MB per file.
- **Image Dimensions:** Extracted and validated optionally, rejecting malformed image data.

### Validation & Error Handling

Validation will occur both client-side (to provide immediate, friendly feedback) and server-side (to enforce security).

- Malicious or unsupported uploads will be gracefully rejected with specific error messages (e.g., "File too large" or "Unsupported file type").
- Error handling will avoid destructive full-page crashes, utilizing inline recovery states.

### Data Boundary Rules

Raw storage bucket parameters, internal Postgres keys, and the exact `storagePath` must never leak into client view models or downstream LLM prompt inputs. The server acts as a secure intermediary, transforming raw DB/storage data into the safe `ClientMediaAttachment` model.

## 5. Storage Abstraction Boundary (Future Extensibility)

To future-proof the architecture for scaling, a clean TypeScript storage interface will abstract all bucket operations. This prepares the system for swapping Supabase Storage with Wasabi (S3-compatible) or other providers without refactoring the core capture services.

```typescript
export interface StorageProvider {
  /**
   * Uploads a file to the storage provider.
   * @param path The destination path (e.g., {user_id}/{capture_id}/{filename.ext})
   * @param file The file Blob/Buffer
   * @param mimeType The file MIME type
   * @returns The saved storage path
   */
  uploadFile(
    path: string,
    file: Blob | Buffer,
    mimeType: string,
  ): Promise<string>;

  /**
   * Generates a short-lived signed URL for secure retrieval.
   * @param path The storage path of the file
   * @param expiresInSeconds Duration until the URL expires
   * @returns The signed URL
   */
  getSignedUrl(path: string, expiresInSeconds: number): Promise<string>;

  /**
   * Deletes a file from the storage provider.
   * @param path The storage path of the file
   */
  deleteFile(path: string): Promise<void>;
}
```

## 6. Future Extensibility & Non-Goals

### Future Extensibility

While MVP focuses solely on single photo attachments, the architecture supports future enrichment, including:

- Voice notes and audio attachments.
- Multi-photo galleries per capture.
- Image EXIF metadata extraction (e.g., location and time).
- Automated AI visual captioning.

### Explicit Deferrals (Non-Goals)

The following tasks and features are explicitly deferred from this design specification:

- **Task 4.2:** Storage bucket provisioning and RLS SQL implementation.
- **Task 4.3:** Upload API routes and components.
- **Task 4.4:** Capture UI photo picker integration.
- **Task 4.5:** Media workflow validation.
- **Story AIC-405:** AI memory generation and summaries.
- **Story AIC-406:** Life timeline view (`/timeline`).
- Wasabi S3 migration.
- Qdrant vector memory integration.
