import { NextRequest, NextResponse } from "next/server";
import { updateEvent, deleteEvent } from "@/lib/data/events";
import { withAuthenticatedUser } from "@/lib/auth-server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; eventId: string }> }
) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { slug, eventId } = await params;
      const body = await request.json();

      const updated = await updateEvent(slug, eventId, {
        title: body.title,
        type: body.type,
        date: body.date,
        endDate: body.endDate,
        location: body.location,
        memo: body.memo,
      });

      if (!updated) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      return NextResponse.json(updated);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || "Failed to update event" },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; eventId: string }> }
) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { slug, eventId } = await params;
      const success = await deleteEvent(slug, eventId);

      if (!success) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json(
        { error: "Failed to delete event" },
        { status: 500 }
      );
    }
  });
}
