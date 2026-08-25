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

export const ConversationRequestSchema = z.object({
  conversationId: z.string().optional(),
  context: PromptContextSchema,
  messages: z.array(ConversationMessageSchema),
  settings: ConversationModelSettingsSchema.optional(),
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
