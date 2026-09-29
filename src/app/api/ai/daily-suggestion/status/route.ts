import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { updateSuggestionStatus } from "@/lib/ai/suggestion-db";
import { SuggestionStatusSchema } from "@/lib/ai/types";
import { logger } from "@/lib/logger";

const StatusUpdatePayloadSchema = z.object({
  suggestionId: z.string().uuid(),
  status: SuggestionStatusSchema,
});

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload;
    try {
      payload = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parseResult = StatusUpdatePayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parseResult.error.format() },
        { status: 400 },
      );
    }

    const { suggestionId, status } = parseResult.data;

    const { data: suggestion, error: updateError } =
      await updateSuggestionStatus(user.id, suggestionId, status);

    if (updateError) {
      if (
        updateError === "Not found" ||
        updateError.includes(
          "JSON object requested, multiple (or no) rows returned",
        )
      ) {
        // If no rows are returned by .single() it means the suggestion wasn't found or doesn't belong to the user
        return NextResponse.json(
          { error: "Suggestion not found or unauthorized to update" },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { error: "Failed to update suggestion status" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: suggestion }, { status: 200 });
  } catch (error) {
    logger.error("Unexpected error in /api/ai/daily-suggestion/status", {
      error,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
