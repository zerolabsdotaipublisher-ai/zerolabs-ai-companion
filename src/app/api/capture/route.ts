import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CreateExperienceCaptureInputSchema } from "@/lib/ai/types";
import { saveExperienceCapture } from "@/lib/ai/capture-db";
import { storageService } from "@/lib/storage/storage-service";

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (
      body.suggestionId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        body.suggestionId,
      )
    ) {
      body.suggestionId = null;
    }
    const validationResult = CreateExperienceCaptureInputSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: validationResult.error },
        { status: 400 },
      );
    }

    const capture = await saveExperienceCapture(user.id, validationResult.data);

    let signedUrl: string | null = null;
    if (capture.mediaMetadata?.storagePath) {
      try {
        signedUrl = await storageService.getSignedUrl(
          capture.mediaMetadata.storagePath,
        );
      } catch (err) {
        console.error("Failed to generate signed URL for saved capture:", err);
      }
    }

    return NextResponse.json({ capture, signedUrl }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating capture:", error);
    return NextResponse.json(
      { error: "Failed to create experience capture" },
      { status: 500 },
    );
  }
}
