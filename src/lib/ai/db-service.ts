import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Database } from "@/types/database.types";
import { logger } from "@/lib/logger";

export type DbResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
type Message = Database["public"]["Tables"]["messages"]["Row"];

/**
 * Creates a new conversation for a user.
 */
export async function createConversation(
  userId: string,
  title?: string,
): Promise<DbResult<Conversation>> {
  try {
    const supabase = await getSupabaseServerClient();
    const typedSupabase =
      supabase as unknown as import("@supabase/supabase-js").SupabaseClient<Database>;

    const { data, error } = await typedSupabase
      .from("conversations")
      .insert([{ user_id: userId, title: title ?? null }])
      .select()
      .single();

    if (error) {
      logger.error("Failed to create conversation", {
        error,
        metadata: { userId },
      });
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: unknown) {
    logger.error("Unexpected error creating conversation", {
      error,
      metadata: { userId },
    });
    return { data: null, error: "Unexpected error creating conversation" };
  }
}

/**
 * Saves a user message to a conversation.
 */
export async function saveUserMessage(
  conversationId: string,
  userId: string,
  content: string,
): Promise<DbResult<Message>> {
  try {
    const supabase = await getSupabaseServerClient();
    const typedSupabase =
      supabase as unknown as import("@supabase/supabase-js").SupabaseClient<Database>;

    const { data, error } = await typedSupabase
      .from("messages")
      .insert([
        {
          conversation_id: conversationId,
          user_id: userId,
          role: "user",
          content,
        },
      ])
      .select()
      .single();

    if (error) {
      logger.error("Failed to save user message", {
        error,
        metadata: { conversationId, userId },
      });
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: unknown) {
    logger.error("Unexpected error saving user message", {
      error,
      metadata: { conversationId, userId },
    });
    return { data: null, error: "Unexpected error saving user message" };
  }
}

/**
 * Saves an AI assistant message to a conversation.
 */
export async function saveAssistantMessage(
  conversationId: string,
  userId: string,
  content: string,
): Promise<DbResult<Message>> {
  try {
    const supabase = await getSupabaseServerClient();
    const typedSupabase =
      supabase as unknown as import("@supabase/supabase-js").SupabaseClient<Database>;

    const { data, error } = await typedSupabase
      .from("messages")
      .insert([
        {
          conversation_id: conversationId,
          user_id: userId,
          role: "assistant",
          content,
        },
      ])
      .select()
      .single();

    if (error) {
      logger.error("Failed to save assistant message", {
        error,
        metadata: { conversationId, userId },
      });
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: unknown) {
    logger.error("Unexpected error saving assistant message", {
      error,
      metadata: { conversationId, userId },
    });
    return { data: null, error: "Unexpected error saving assistant message" };
  }
}

/**
 * Retrieves all messages for a given conversation, ordered chronologically.
 */
export async function getConversationMessages(
  conversationId: string,
  limit?: number,
  offset?: number,
): Promise<DbResult<Message[]>> {
  try {
    const supabase = await getSupabaseServerClient();
    const typedSupabase =
      supabase as unknown as import("@supabase/supabase-js").SupabaseClient<Database>;

    const { data, error } = await typedSupabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .range(offset || 0, (offset || 0) + (limit || 50) - 1);

    if (error) {
      logger.error("Failed to get conversation messages", {
        error,
        metadata: { conversationId },
      });
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: unknown) {
    logger.error("Unexpected error getting conversation messages", {
      error,
      metadata: { conversationId },
    });
    return {
      data: null,
      error: "Unexpected error getting conversation messages",
    };
  }
}

/**
 * Retrieves the most recent conversation for a given user.
 */
export async function getLatestConversation(
  userId: string,
): Promise<DbResult<Conversation | null>> {
  try {
    const supabase = await getSupabaseServerClient();
    const typedSupabase =
      supabase as unknown as import("@supabase/supabase-js").SupabaseClient<Database>;

    const { data, error } = await typedSupabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error("Failed to get latest conversation", {
        error,
        metadata: { userId },
      });
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: unknown) {
    logger.error("Unexpected error getting latest conversation", {
      error,
      metadata: { userId },
    });
    return {
      data: null,
      error: "Unexpected error getting latest conversation",
    };
  }
}
