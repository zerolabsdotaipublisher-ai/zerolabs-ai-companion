import "server-only";

import { ConversationMessage, PromptContext } from "./types";
import { resolvePersonality } from "./personalities";

/**
 * Interface for the inputs required to compose a full AI prompt.
 */
export interface PromptComposerInput {
  /** User context containing profile preferences and identity. */
  context?: PromptContext | null;
  /** Chronological list of past messages. Can include DB metadata which is stripped. */
  history?: (ConversationMessage | Record<string, unknown>)[];
  /** The most recent active message from the user. */
  activeMessage: ConversationMessage;
}

const SYSTEM_DIRECTIVES = `You are the AI Companion, a "quiet companion" designed to be calm, supportive, minimalist, and suggestion-first.
Your communication style is concise, conversational, and deeply empathetic without being overbearing.

Strict Guardrails:
- No lecturing: Do not act like a strict productivity coach or teacher.
- No nagging: Do not pester the user or demand action.
- No mandatory journaling: Do not force the user into structured journaling prompts.
- Suggestion-first: Offer gentle suggestions or reflections rather than directives.`;

/**
 * Generates the System Tier message for the prompt sequence.
 * Enforces the core persona ("Quiet Companion"), applies strict behavioral guardrails,
 * and interpolates user-specific tone and style directives based on the configured vibe.
 * Defaults to safe fallbacks (Name: "Friend", Vibe: "Spontaneous") if context is missing.
 *
 * @param context - The user context preferences.
 * @returns A ConversationMessage with role "system".
 */
export function generateSystemTier(
  context?: PromptContext | null,
): ConversationMessage {
  const displayName = context?.display_name || "Friend";
  const vibe = context?.companion_vibe || "Spontaneous";

  const personality = resolvePersonality(vibe);

  const userContextString = `User Context:
- Name: ${displayName}
- Vibe: ${vibe}

Personality Directives:
- Tone: ${personality.tone}
- Style: ${personality.style}
${personality.directives}`;

  return {
    role: "system",
    content: `${SYSTEM_DIRECTIVES}\n\n${userContextString}`,
  };
}

/**
 * Generates the Conversation Context Tier messages.
 * Responsible for:
 * - Filtering out unsupported roles (keeps only 'user' or 'assistant').
 * - Deduplicating the active message if it's identical to the last user message.
 * - Enforcing a sliding window of max 20 messages.
 * - Truncating individual messages to 1000 characters.
 * - Stripping all raw relational database metadata from the payload.
 *
 * @param history - Raw history turns from the DB.
 * @param activeMessageContent - The active message content used to deduplicate.
 * @returns A sanitized and truncated array of ConversationMessages.
 */
export function generateConversationContextTier(
  history: (ConversationMessage | Record<string, unknown>)[],
  activeMessageContent: string,
): ConversationMessage[] {
  // 1. Map to ConversationMessage and strip metadata by explicitly returning only role and content
  // Note: any extra keys (like id, created_at) are naturally excluded.
  const sanitizedHistory: ConversationMessage[] = history
    .map((msg: unknown) => {
      // Ensure we only grab role and content. Ignore unsupported roles.
      const msgObj = msg as Record<string, unknown>;
      const role = typeof msgObj?.role === "string" ? msgObj.role : undefined;
      const content = typeof msgObj?.content === "string" ? msgObj.content : "";
      return { role, content } as ConversationMessage;
    })
    .filter((msg) => msg.role === "user" || msg.role === "assistant");

  // 2. Deduplicate active message: if the very last message in the filtered history matches the active prompt, remove it.
  if (
    sanitizedHistory.length > 0 &&
    sanitizedHistory[sanitizedHistory.length - 1].role === "user" &&
    sanitizedHistory[sanitizedHistory.length - 1].content.trim() ===
      activeMessageContent.trim()
  ) {
    sanitizedHistory.pop();
  }

  // 3. Sliding window limit (last 20 messages max)
  const windowedHistory = sanitizedHistory.slice(-20);

  // 4. Character truncation (max 1000 per message)
  const truncatedHistory = windowedHistory.map((msg) => {
    if (msg.content.length > 1000) {
      return {
        ...msg,
        content: msg.content.slice(0, 1000) + "... [truncated]",
      };
    }
    return msg;
  });

  return truncatedHistory;
}

/**
 * Generates the User Message Tier for the prompt sequence.
 * Ensures the role is strictly forced to 'user' and sanitizes placement.
 *
 * @param activeMessage - The raw active user message.
 * @returns A ConversationMessage with role forced to "user" and trimmed content.
 */
export function generateUserMessageTier(
  activeMessage: ConversationMessage,
): ConversationMessage {
  // Normalize and clean placement
  // Assuming activeMessage already has role: 'user'. Ensure we only take role and content to strip DB properties.
  return {
    role: activeMessage.role === "user" ? "user" : "user", // force 'user' for safety
    content: (activeMessage.content || "").trim(),
  };
}

/**
 * Composes a full array of messages to be sent to the LLM orchestration layer.
 * Strictly enforces a four-tier sequence:
 * 1. System Prompt (Directives)
 * 2. User Context (Profile/Tone) included within the system message
 * 3. Conversation Context (Truncated sliding window)
 * 4. Active User Message
 *
 * @param input - The payload containing context, history, and activeMessage.
 * @returns The final array of cleanly formatted ConversationMessages.
 */
export function composePrompt(
  input: PromptComposerInput,
): ConversationMessage[] {
  const { context, history = [], activeMessage } = input;

  const systemMessage = generateSystemTier(context);
  const activeUserMessage = generateUserMessageTier(activeMessage);
  const contextMessages = generateConversationContextTier(
    history,
    activeUserMessage.content,
  );

  return [systemMessage, ...contextMessages, activeUserMessage];
}
