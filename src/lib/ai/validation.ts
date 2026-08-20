import "server-only";
import { z } from "zod";
import { MessageRoleSchema, ConversationModelSettingsSchema } from "./types";

// Helper to sanitize message content
export function sanitizeMessageContent(content: string): string {
  if (typeof content !== "string") return "";
  // Remove HTML tags
  let sanitized = content.replace(/<[^>]*>?/gm, "");
  // Remove invalid control characters (keep \n, \r, \t)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");
  return sanitized.trim();
}

export const ConversationInputSchema = z.object({
  messages: z
    .array(
      z.object({
        role: MessageRoleSchema,
        content: z
          .string()
          .transform(sanitizeMessageContent)
          .refine((val) => val.length > 0, {
            message: "Message content cannot be empty after sanitization",
          }),
      }),
    )
    .min(1, "At least one message is required"),
  settings: ConversationModelSettingsSchema.optional(),
});

export type ConversationInput = z.infer<typeof ConversationInputSchema>;
