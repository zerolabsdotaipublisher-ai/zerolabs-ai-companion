import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { updateMemoryText, deleteMemory } from "@/lib/ai/memory-db";
import { z } from "zod";

const UpdateMemorySchema = z.object({
  summaryText: z.string().min(1).max(280),
});

export async function PATCH(
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

    const body = await request.json();
    const validated = UpdateMemorySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: validated.error.flatten(),
        },
        { status: 400 },
      );
    }

    const updatedMemory = await updateMemoryText(
      user.id,
      id,
      validated.data.summaryText,
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

export async function DELETE(
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

    await deleteMemory(user.id, id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const e = error as Error;
    return NextResponse.json(
      { error: e.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
