import { NextRequest, NextResponse } from "next/server";
import { addSubmission } from "@/lib/mockStore";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { address_text, lat, lng } = body;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json(
      { error: "lat and lng are required numbers" },
      { status: 400 }
    );
  }

  const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  addSubmission({ id, lat, lng });

  return NextResponse.json({
    success: true,
    id,
    address_text,
    lat,
    lng,
  });
}
