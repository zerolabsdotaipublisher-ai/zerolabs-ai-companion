import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getTimelineMemories } from "@/lib/ai/memory-db";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse query params
    const limitParam = searchParams.get("limit");
    const cursor = searchParams.get("cursor") || undefined;
    const suggestionId = searchParams.get("suggestionId") || undefined;

    let limit: number | undefined = undefined;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit)) {
        limit = parsedLimit;
      }
    }

    const input: Record<string, unknown> = { cursor, suggestionId };
    if (limit !== undefined) input.limit = limit;
    const response = await getTimelineMemories(
      user.id,
      input as import("@/lib/ai/types").TimelineQueryInput,
    );

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Error in timeline API route", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
