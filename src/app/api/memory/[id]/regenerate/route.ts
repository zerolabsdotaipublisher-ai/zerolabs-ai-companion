import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getMemoryById, updateMemoryText } from "@/lib/ai/memory-db";
import { getCaptureById } from "@/lib/ai/capture-db";
import { generateMemorySummary } from "@/lib/ai/memory-generator";
import { getSuggestionById } from "@/lib/ai/suggestion-db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing memory ID" }, { status: 400 });
    }

    // Retrieve existing memory to get the captureId
    const memoryRecord = await getMemoryById(user.id, id);
    if (!memoryRecord) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    // Fetch the linked capture
    const capture = await getCaptureById(user.id, memoryRecord.captureId);
    if (!capture) {
      return NextResponse.json(
        { error: "Source capture not found" },
        { status: 404 },
      );
    }

    // Fetch suggestion title if suggestion exists
    let suggestionTitle: string | null = null;
    if (memoryRecord.suggestionId) {
      const suggestion = await getSuggestionById(
        user.id,
        memoryRecord.suggestionId,
      );
      if (suggestion) {
        suggestionTitle = suggestion.primarySuggestion;
      }
    }

    // Generate new summary
    const captureContext = {
      noteText: capture.noteText,
      mediaMetadata: capture.mediaMetadata,
      suggestionTitle: suggestionTitle,
    };
    const newSummaryOutput = await generateMemorySummary(
      user.id,
      captureContext,
    );

    // Persist new summary
    const updatedMemory = await updateMemoryText(
      user.id,
      id,
      newSummaryOutput.summaryText,
    );

    return NextResponse.json({ memory: updatedMemory }, { status: 200 });
  } catch (error) {
    const e = error as Error;
    return NextResponse.json(
      { error: e.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
