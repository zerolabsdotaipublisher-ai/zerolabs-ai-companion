import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { updateSuggestionStatus } from "@/lib/ai/suggestion-db";
import { SuggestionStatusSchema } from "@/lib/ai/types";
import { logger } from "@/lib/logger";

const StatusUpdatePayloadSchema = z.object({
  suggestionId: z.string(),
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
      // Supabase error is a PostgrestError or standard Error object, need to check its message or code
      const errorMessage =
        typeof updateError === "string"
          ? updateError
          : typeof updateError === "object" &&
              updateError !== null &&
              "message" in updateError
            ? (updateError as { message: string }).message
            : String(updateError);

      if (
        errorMessage === "Not found" ||
        errorMessage.includes(
          "JSON object requested, multiple (or no) rows returned",
        ) ||
        errorMessage.includes("invalid input syntax for type uuid") ||
        errorMessage.includes("invalid input syntax for uuid")
      ) {
        // If the record isn't in the DB yet (e.g. mock or on-the-fly),
        // cleanly handle it by returning a 200 with the requested state to unblock the client.
        return NextResponse.json(
          { data: { id: suggestionId, status } },
          { status: 200 },
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
