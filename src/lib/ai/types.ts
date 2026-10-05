import { z } from "zod";

export const PromptContextSchema = z.object({
  display_name: z.string(),
  companion_vibe: z.string(),
  personalization: z.record(z.string(), z.unknown()),
});

export type PromptContext = z.infer<typeof PromptContextSchema>;

export const MessageRoleSchema = z.enum(["user", "assistant", "system"]);

export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const ConversationMessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string(),
});

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;

export const ConversationModelSettingsSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().positive().optional(),
  top_p: z.number().min(0).max(1).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
});

export type ConversationModelSettings = z.infer<
  typeof ConversationModelSettingsSchema
>;

export const SuggestionContextSchema = z.object({
  primarySuggestion: z.string(),
  supportingContext: z.string().optional(),
  estimatedDuration: z.string().optional(),
  categoryTags: z.array(z.string()).optional(),
});

export type SuggestionContext = z.infer<typeof SuggestionContextSchema>;

export const ConversationRequestSchema = z.object({
  conversationId: z.string().optional(),
  context: PromptContextSchema,
  messages: z.array(ConversationMessageSchema),
  settings: ConversationModelSettingsSchema.optional(),
  suggestionContext: SuggestionContextSchema.optional(),
});

export type ConversationRequest = z.infer<typeof ConversationRequestSchema>;

export const TokenUsageSchema = z.object({
  prompt_tokens: z.number().nonnegative(),
  completion_tokens: z.number().nonnegative(),
  total_tokens: z.number().nonnegative(),
});

export type TokenUsage = z.infer<typeof TokenUsageSchema>;

export const ConversationResponseSchema = z.object({
  message: ConversationMessageSchema,
  metadata: z
    .object({
      model: z.string(),
      finish_reason: z.string().optional(),
    })
    .catchall(z.unknown())
    .optional(),
  usage: TokenUsageSchema.optional(),
});

export type ConversationResponse = z.infer<typeof ConversationResponseSchema>;

export const ErrorCodeSchema = z.enum([
  "RATE_LIMIT_EXCEEDED",
  "TIMEOUT",
  "API_ERROR",
  "INVALID_REQUEST",
  "INTERNAL_ERROR",
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ConversationErrorSchema = z.object({
  error: z.literal(true),
  code: ErrorCodeSchema,
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ConversationError = z.infer<typeof ConversationErrorSchema>;

export const DailySuggestionOutputSchema = z.object({
  primarySuggestion: z.string().max(255),
  supportingContext: z.string().max(500),
  alternatives: z.array(z.string().max(255)).min(1).max(2),
  estimatedDuration: z.string(),
  categoryTags: z.array(z.string()).min(1).max(5),
});

export type DailySuggestionOutput = z.infer<typeof DailySuggestionOutputSchema>;

export const SuggestionStatusSchema = z.enum([
  "pending",
  "accepted",
  "skipped",
  "alternative_requested",
]);

export type SuggestionStatus = z.infer<typeof SuggestionStatusSchema>;

export const DailySuggestionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  primarySuggestion: z.string().max(255),
  supportingContext: z.string().max(500),
  alternatives: z.array(z.string().max(255)).min(1).max(2),
  estimatedDuration: z.enum(["15m", "30m", "1h", "flex"]).optional().nullable(),
  categoryTags: z.array(z.string()).max(3),
  createdAt: z.string().datetime(),
  status: SuggestionStatusSchema.default("pending"),
});

export type DailySuggestion = z.infer<typeof DailySuggestionSchema>;

export type ClientDailySuggestion = Omit<
  DailySuggestion,
  "userId" | "createdAt"
>;

export const MediaMetadataSchema = z.object({
  storagePath: z.string().min(1),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  uploadedAt: z.string().datetime(),
});

export type MediaMetadata = z.infer<typeof MediaMetadataSchema>;

export const CreateExperienceCaptureInputSchema = z.object({
  suggestionId: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .describe("Optional UUID referencing daily_suggestions.id"),
  noteText: z
    .string()
    .max(1000)
    .trim()
    .optional()
    .nullable()
    .describe("Optional string for short notes or reflections"),
  mediaMetadata: MediaMetadataSchema.optional()
    .nullable()
    .describe("Optional media attachment metadata"),
});

export type CreateExperienceCaptureInput = z.infer<
  typeof CreateExperienceCaptureInputSchema
>;

export const ExperienceCaptureSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().describe("UUID referencing auth.users(id)"),
  suggestionId: z.string().uuid().optional().nullable(),
  noteText: z.string().max(1000).trim().optional().nullable(),
  mediaMetadata: MediaMetadataSchema.optional().nullable(),
  createdAt: z
    .string()
    .datetime()
    .describe("UTC TIMESTAMPTZ, defaults to now()"),
});

export type ExperienceCapture = z.infer<typeof ExperienceCaptureSchema>;

export type ClientExperienceCapture = Omit<
  ExperienceCapture,
  "id" | "userId" | "createdAt" | "suggestionId"
>;
