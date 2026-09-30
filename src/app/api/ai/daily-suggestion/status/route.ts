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
      // Never block the client on a status update if the suggestion is mock or fails to update in the DB.
      // We always return 200 success with the optimistic state to unblock the UI.
      logger.warn("Non-fatal error updating daily suggestion status", {
        error: updateError,
        metadata: { userId: user.id, suggestionId, status },
      });
      return NextResponse.json(
        { success: true, data: { id: suggestionId, status } },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { success: true, data: suggestion },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Unexpected error in /api/ai/daily-suggestion/status", {
      error,
    });
    // For internal unexpected errors (like DB down), we will still return 200 to allow optimistic updates
    return NextResponse.json(
      { success: true, data: { id: "unknown", status: "pending" } },
      { status: 200 },
    );
  }
}
