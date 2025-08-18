import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(request: Request) {
  try {
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Board name is required" },
        { status: 400 }
      );
    }

    // Delete test boards matching the name
    await db.board.deleteMany({
      where: {
        name: name,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cleaning up test boards:", error);
    return NextResponse.json(
      { error: "Failed to clean up test boards" },
      { status: 500 }
    );
  }
}
