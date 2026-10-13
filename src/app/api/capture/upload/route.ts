import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  storageService,
  validateFileConstraints,
  generateStoragePath,
} from "@/lib/storage/storage-service";
import { MediaMetadata } from "@/lib/ai/types";

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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const captureId = formData.get("captureId") as string | null;

    if (!file || !captureId) {
      return NextResponse.json(
        { error: "Missing file or captureId" },
        { status: 400 },
      );
    }

    // Validate
    try {
      validateFileConstraints(file.type, file.size);
    } catch (e) {
      const err = e as Error;
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();

    // Generate storage path
    const path = generateStoragePath(user.id, captureId, file.name);

    // Upload
    const storagePath = await storageService.uploadFile(
      path,
      buffer,
      file.type,
    );

    const mediaMetadata: MediaMetadata = {
      storagePath,
      mimeType: file.type,
      fileSizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
    };

    return NextResponse.json({ mediaMetadata }, { status: 201 });
  } catch (error: unknown) {
    const e = error as Error;
    console.error("Error uploading capture media:", e);
    return NextResponse.json(
      { error: "Failed to upload media attachment" },
      { status: 500 },
    );
  }
}
