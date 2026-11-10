import "server-only";

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  getTodaySuggestion,
  saveDailySuggestion,
} from "@/lib/ai/suggestion-db";
import { generateDailySuggestion } from "@/lib/ai/suggestion-generator";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: recentSuggestion, error: getError } =
      await getTodaySuggestion(user.id);

    if (getError) {
      logger.error("Failed to get today's suggestion", { error: getError });
      return NextResponse.json(
        { error: "Failed to fetch suggestions" },
        { status: 500 },
      );
    }

    if (recentSuggestion && recentSuggestion.status === "pending") {
      return NextResponse.json({ data: recentSuggestion }, { status: 200 });
    }

    if (
      recentSuggestion &&
      (recentSuggestion.status === "accepted" ||
        recentSuggestion.status === "skipped")
    ) {
      return NextResponse.json({ data: recentSuggestion }, { status: 200 });
    }

    const generatedSuggestion = await generateDailySuggestion(user.id);
    const savedResult = await saveDailySuggestion(user.id, generatedSuggestion);

    return NextResponse.json({ data: savedResult.data }, { status: 200 });
  } catch (error) {
    logger.error("Unexpected error in /api/ai/daily-suggestion", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
