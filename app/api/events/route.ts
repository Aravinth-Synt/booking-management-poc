import { NextResponse } from "next/server";
import { MOCK_EVENTS } from "@/data/mockEvents";
import { Event } from "@/types/events";

export async function GET() {
  let events: Event[];
  let source: "ct" | "mock" = "ct";

  try {

    events = []; 

    if (!events || events.length === 0) {
      events = MOCK_EVENTS;
      source = "mock";
    }
  } catch {
    events = MOCK_EVENTS;
    source = "mock";
  }

  return NextResponse.json({
    events,
    source,
  });
}