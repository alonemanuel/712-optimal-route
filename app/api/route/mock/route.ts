import { NextResponse } from "next/server";
import { generateMockSubmissions } from "@/lib/algorithm/mockData";
import { computeOptimalRoute } from "@/lib/algorithm/route";

export async function GET() {
  const submissions = generateMockSubmissions({ count: 80, seed: 42 });
  const route = computeOptimalRoute(submissions);

  return NextResponse.json(route);
}
