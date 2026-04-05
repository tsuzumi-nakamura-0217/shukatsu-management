import { NextRequest, NextResponse } from "next/server";
import { getEvents, createEvent } from "@/lib/data/events";
import { withAuthenticatedUser } from "@/lib/auth-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { slug } = await params;
      const events = await getEvents(slug);
      return NextResponse.json(events);
    } catch {
      return NextResponse.json(
        { error: "Failed to fetch events" },
        { status: 500 }
      );
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { slug } = await params;
      const body = await request.json();

      if (!body.title || !body.date) {
        return NextResponse.json(
          { error: "Title and date are required" },
          { status: 400 }
        );
      }

      const newEvent = await createEvent(slug, {
        title: body.title,
        type: body.type || "説明会",
        date: body.date,
        endDate: body.endDate,
        location: body.location || "",
        memo: body.memo || "",
      });

      return NextResponse.json(newEvent, { status: 201 });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || "Failed to create event" },
        { status: 500 }
      );
    }
  });
}
