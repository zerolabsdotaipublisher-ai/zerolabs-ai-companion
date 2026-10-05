import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  CreateExperienceCaptureInput,
  CreateExperienceCaptureInputSchema,
  ExperienceCapture,
  ClientExperienceCapture,
} from "@/lib/ai/types";
import { Database } from "@/types/database.types";

type CaptureRow = Database["public"]["Tables"]["captures"]["Row"];

function mapRowToClientCapture(row: CaptureRow): ClientExperienceCapture {
  return {
    noteText: row.note_text,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mediaMetadata: row.media_metadata as any,
  };
}

export function mapRowToExperienceCapture(row: CaptureRow): ExperienceCapture {
  return {
    id: row.id,
    userId: row.user_id,
    suggestionId: row.suggestion_id,
    noteText: row.note_text,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mediaMetadata: row.media_metadata as any,
    createdAt: row.created_at,
  };
}

export async function saveExperienceCapture(
  userId: string,
  input: CreateExperienceCaptureInput,
): Promise<ClientExperienceCapture> {
  if (!userId) {
    throw new Error("userId is required");
  }

  const validatedInput = CreateExperienceCaptureInputSchema.parse(input);

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("captures")
    .insert({
      user_id: userId,
      suggestion_id: validatedInput.suggestionId || null,
      note_text: validatedInput.noteText || null,
      media_metadata: validatedInput.mediaMetadata
        ? (validatedInput.mediaMetadata as unknown as Database["public"]["Tables"]["captures"]["Insert"]["media_metadata"])
        : null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save experience capture: ${error.message}`);
  }

  if (!data) {
    throw new Error("Failed to save experience capture: No data returned");
  }

  return mapRowToClientCapture(data);
}

export async function getUserCaptures(
  userId: string,
  limit: number = 50,
): Promise<ClientExperienceCapture[]> {
  if (!userId) {
    throw new Error("userId is required");
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("captures")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get experience captures: ${error.message}`);
  }

  return (data || []).map(mapRowToClientCapture);
}

export async function getCaptureById(
  userId: string,
  captureId: string,
): Promise<ClientExperienceCapture | null> {
  if (!userId) {
    throw new Error("userId is required");
  }

  if (!captureId) {
    throw new Error("captureId is required");
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("captures")
    .select("*")
    .eq("user_id", userId)
    .eq("id", captureId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to get experience capture: ${error.message}`);
  }

  return data ? mapRowToClientCapture(data) : null;
}
