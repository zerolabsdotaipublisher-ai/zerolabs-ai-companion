import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Database } from "@/types/database.types";
import { logger } from "@/lib/logger";
import {
  DailySuggestionOutput,
  SuggestionStatus,
  ClientDailySuggestion,
} from "./types";
import { DbResult } from "./db-service";

type DailySuggestionRow =
  Database["public"]["Tables"]["daily_suggestions"]["Row"];

/**
 * Maps a raw database row to a ClientDailySuggestion by stripping internal metadata.
 */
function mapRowToClientSuggestion(
  row: DailySuggestionRow,
): ClientDailySuggestion {
  return {
    id: row.id,
    primarySuggestion: row.primary_suggestion,
    supportingContext: row.supporting_context,
    alternatives: (row.alternatives as string[]) || [],
    estimatedDuration:
      (row.estimated_duration as unknown as "15m" | "30m" | "1h" | "flex") ||
      null,
    categoryTags: (row.category_tags as string[]) || [],
    status: row.status as SuggestionStatus,
  };
}

/**
 * Saves a new daily suggestion to the database.
 */
export async function saveDailySuggestion(
  userId: string,
  suggestion: DailySuggestionOutput,
): Promise<DbResult<ClientDailySuggestion>> {
  try {
    const supabase = await getSupabaseServerClient();
    const typedSupabase =
      supabase as unknown as import("@supabase/supabase-js").SupabaseClient<Database>;

    const { data, error } = await typedSupabase
      .from("daily_suggestions")
      .insert([
        {
          user_id: userId,
          primary_suggestion: suggestion.primarySuggestion,
          supporting_context: suggestion.supportingContext,
          alternatives: suggestion.alternatives,
          estimated_duration: suggestion.estimatedDuration,
          category_tags: suggestion.categoryTags,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      logger.error("Failed to save daily suggestion", {
        error,
        metadata: { userId },
      });
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: "Not found" };
    }

    return { data: mapRowToClientSuggestion(data), error: null };
  } catch (error: unknown) {
    logger.error("Unexpected error saving daily suggestion", {
      error,
      metadata: { userId },
    });
    return { data: null, error: "Unexpected error saving daily suggestion" };
  }
}

/**
 * Updates the status of an existing daily suggestion.
 */
export async function updateSuggestionStatus(
  userId: string,
  suggestionId: string,
  status: SuggestionStatus,
): Promise<DbResult<ClientDailySuggestion>> {
  try {
    const supabase = await getSupabaseServerClient();
    const typedSupabase =
      supabase as unknown as import("@supabase/supabase-js").SupabaseClient<Database>;

    const { data, error } = await typedSupabase
      .from("daily_suggestions")
      .update({ status })
      .eq("id", suggestionId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      logger.error("Failed to update daily suggestion status", {
        error,
        metadata: { userId, suggestionId, status },
      });
      return { data: null, error: error.message };
    }

    return { data: mapRowToClientSuggestion(data), error: null };
  } catch (error: unknown) {
    logger.error("Unexpected error updating daily suggestion status", {
      error,
      metadata: { userId, suggestionId, status },
    });
    return {
      data: null,
      error: "Unexpected error updating daily suggestion status",
    };
  }
}

/**
 * Retrieves the most recent daily suggestions for a user, ordered chronologically.
 */
export async function getRecentDailySuggestions(
  userId: string,
  limit: number = 5,
): Promise<DbResult<ClientDailySuggestion[]>> {
  try {
    const supabase = await getSupabaseServerClient();
    const typedSupabase =
      supabase as unknown as import("@supabase/supabase-js").SupabaseClient<Database>;

    const { data, error } = await typedSupabase
      .from("daily_suggestions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("Failed to get recent daily suggestions", {
        error,
        metadata: { userId },
      });
      return { data: null, error: error.message };
    }

    return { data: data.map(mapRowToClientSuggestion), error: null };
  } catch (error: unknown) {
    logger.error("Unexpected error getting recent daily suggestions", {
      error,
      metadata: { userId },
    });
    return {
      data: null,
      error: "Unexpected error getting recent daily suggestions",
    };
  }
}
