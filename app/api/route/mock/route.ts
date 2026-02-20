import { NextResponse } from "next/server";
import { getSubmissions } from "@/lib/mockStore";
import { computeOptimalRoute } from "@/lib/algorithm/route";

export const dynamic = "force-dynamic";

export async function GET() {
  const submissions = getSubmissions();
  const route = computeOptimalRoute(submissions);

  return NextResponse.json(route);
}
