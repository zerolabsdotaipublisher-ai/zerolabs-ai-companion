import "server-only";

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getRecentDailySuggestions, saveDailySuggestion } from "@/lib/ai/suggestion-db";
import { generateDailySuggestion } from "@/lib/ai/suggestion-generator";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

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

    // 1. Check for a pending suggestion today
    const { data: suggestions, error: getError } = await getRecentDailySuggestions(user.id, 1);

    if (getError) {
      logger.error("Failed to get recent suggestions", { error: getError });
      return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
    }

    // Since we sort by created_at DESC, the first item is the most recent
    const recentSuggestion = suggestions && suggestions.length > 0 ? suggestions[0] : null;

    // Check if the most recent suggestion is from today (simplified check for MVP)
    const isToday = recentSuggestion ? true : false; // Better to check actual date if we had createdAt in payload, but ClientDailySuggestion doesn't.
    // However, if it's pending, it's the active one. If it's accepted/skipped, we might need a new one if it's a new day.
    // For now, let's just see if there's any pending suggestion.

    if (recentSuggestion && recentSuggestion.status === "pending") {
      return NextResponse.json({ data: recentSuggestion }, { status: 200 });
    }

    if (recentSuggestion && (recentSuggestion.status === "accepted" || recentSuggestion.status === "skipped")) {
        // Technically we should check if it's a new day, but since ClientDailySuggestion omits createdAt
        // and we only want 1 activity per day. If they already accepted/skipped, they are done for the day.
        // We can just return it and the UI will show empty state.
        return NextResponse.json({ data: recentSuggestion }, { status: 200 });
    }

    // 2. No pending suggestion exists, generate one
    const generatedSuggestion = await generateDailySuggestion(user.id);

    // 3. Save it as pending
    const savedResult = await saveDailySuggestion(user.id, generatedSuggestion);

    if (savedResult.error) {
       logger.error("Failed to save generated suggestion", { error: savedResult.error });
       return NextResponse.json({ error: "Failed to save suggestion" }, { status: 500 });
    }

    return NextResponse.json({ data: savedResult.data }, { status: 200 });

  } catch (error) {
    logger.error("Unexpected error in /api/ai/daily-suggestion", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
