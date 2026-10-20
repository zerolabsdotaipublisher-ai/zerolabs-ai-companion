import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  CreateMemoryInput,
  CreateMemoryInputSchema,
  ClientMemory,
} from "./types";
import { Database } from "@/types/database.types";

export type MemoryDbRow = Database["public"]["Tables"]["memories"]["Row"];

function mapRowToClientMemory(row: MemoryDbRow): ClientMemory {
  return {
    summaryText: row.summary_text,
    mediaMetadataRef:
      row.media_metadata_ref as ClientMemory["mediaMetadataRef"],
  };
}

export async function saveMemory(
  userId: string,
  input: CreateMemoryInput,
): Promise<ClientMemory> {
  const validated = CreateMemoryInputSchema.safeParse(input);
  if (!validated.success) {
    throw new Error(`Invalid memory input: ${validated.error.message}`);
  }

  const supabase = await getSupabaseServerClient();

  try {
    const { data: existingData, error: selectError } = await supabase
      .from("memories")
      .select("*")
      .eq("user_id", userId)
      .eq("capture_id", input.captureId)
      .single();

    if (existingData) {
      const { data: updatedData, error: updateError } = await supabase
        .from("memories")
        .update({
          summary_text: input.summaryText,
          media_metadata_ref: input.mediaMetadataRef || null,
          suggestion_id: input.suggestionId || null,
        })
        .eq("id", existingData.id)
        .select()
        .single();

      if (updateError) {
        logger.error(`Error updating memory: ${updateError.message}`);
        throw new Error("Failed to update memory");
      }

      return mapRowToClientMemory(updatedData);
    }

    if (selectError && selectError.code !== "PGRST116") {
      logger.error(`Error checking existing memory: ${selectError.message}`);
      throw new Error("Failed to check existing memory");
    }

    const { data: newRow, error: insertError } = await supabase
      .from("memories")
      .insert({
        user_id: userId,
        capture_id: input.captureId,
        suggestion_id: input.suggestionId || null,
        summary_text: input.summaryText,
        media_metadata_ref: input.mediaMetadataRef || null,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        // unique constraint violation on capture_id
        const { data: retryData, error: retrySelectError } = await supabase
          .from("memories")
          .select("*")
          .eq("user_id", userId)
          .eq("capture_id", input.captureId)
          .single();

        if (retrySelectError || !retryData) {
          logger.error(
            `Error fetching existing memory on unique violation: ${retrySelectError?.message}`,
          );
          throw new Error("Failed to insert or find existing memory");
        }

        const { data: retryUpdateData, error: retryUpdateError } =
          await supabase
            .from("memories")
            .update({
              summary_text: input.summaryText,
              media_metadata_ref: input.mediaMetadataRef || null,
              suggestion_id: input.suggestionId || null,
            })
            .eq("id", retryData.id)
            .select()
            .single();

        if (retryUpdateError) {
          logger.error(
            `Error updating memory on unique violation: ${retryUpdateError.message}`,
          );
          throw new Error("Failed to update memory on retry");
        }
        return mapRowToClientMemory(retryUpdateData);
      }
      logger.error(`Error inserting memory: ${insertError.message}`);
      throw new Error("Failed to insert memory");
    }

    return mapRowToClientMemory(newRow);
  } catch (error) {
    const e = error as Error;
    logger.error("Error in saveMemory:", { error: e.message });
    throw e;
  }
}

export async function getUserMemories(
  userId: string,
  limit: number = 50,
): Promise<ClientMemory[]> {
  const supabase = await getSupabaseServerClient();
  try {
    const { data, error } = await supabase
      .from("memories")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error(`Error fetching user memories: ${error.message}`);
      throw new Error("Failed to fetch memories");
    }

    return (data || []).map(mapRowToClientMemory);
  } catch (error) {
    const e = error as Error;
    logger.error("Error in getUserMemories:", { error: e.message });
    throw e;
  }
}

export async function getMemoryByCaptureId(
  userId: string,
  captureId: string,
): Promise<ClientMemory | null> {
  const supabase = await getSupabaseServerClient();
  try {
    const { data, error } = await supabase
      .from("memories")
      .select("*")
      .eq("user_id", userId)
      .eq("capture_id", captureId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      logger.error(`Error fetching memory by capture ID: ${error.message}`);
      throw new Error("Failed to fetch memory by capture ID");
    }

    return mapRowToClientMemory(data);
  } catch (error) {
    const e = error as Error;
    logger.error("Error in getMemoryByCaptureId:", { error: e.message });
    throw e;
  }
}

export async function updateMemoryText(
  userId: string,
  memoryId: string,
  summaryText: string,
): Promise<ClientMemory> {
  if (!summaryText || summaryText.length < 1 || summaryText.length > 280) {
    throw new Error(
      "Invalid summary text: must be between 1 and 280 characters",
    );
  }

  const supabase = await getSupabaseServerClient();

  try {
    const { data, error } = await supabase
      .from("memories")
      .update({ summary_text: summaryText })
      .eq("id", memoryId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      logger.error(`Error updating memory text: ${error.message}`);
      throw new Error("Failed to update memory text");
    }

    if (!data) {
      throw new Error("Memory not found or not owned by user");
    }

    return mapRowToClientMemory(data);
  } catch (error) {
    const e = error as Error;
    logger.error("Error in updateMemoryText:", { error: e.message });
    throw e;
  }
}

export async function deleteMemory(
  userId: string,
  memoryId: string,
): Promise<boolean> {
  const supabase = await getSupabaseServerClient();

  try {
    const { error } = await supabase
      .from("memories")
      .delete()
      .eq("id", memoryId)
      .eq("user_id", userId);

    if (error) {
      logger.error(`Error deleting memory: ${error.message}`);
      throw new Error("Failed to delete memory");
    }

    return true;
  } catch (error) {
    const e = error as Error;
    logger.error("Error in deleteMemory:", { error: e.message });
    throw e;
  }
}

export async function getMemoryById(
  userId: string,
  memoryId: string,
): Promise<
  | (ClientMemory & {
      captureId: string;
      suggestionId: string | null;
      id: string;
    })
  | null
> {
  const supabase = await getSupabaseServerClient();
  try {
    const { data, error } = await supabase
      .from("memories")
      .select("*")
      .eq("user_id", userId)
      .eq("id", memoryId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      logger.error(`Error fetching memory by ID: ${error.message}`);
      throw new Error("Failed to fetch memory by ID");
    }

    const clientMem = mapRowToClientMemory(data);
    return {
      ...clientMem,
      captureId: data.capture_id,
      suggestionId: data.suggestion_id,
      id: data.id,
    };
  } catch (error) {
    const e = error as Error;
    logger.error("Error in getMemoryById:", { error: e.message });
    throw e;
  }
}
