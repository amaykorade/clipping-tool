import { NextResponse } from "next/server";
import { EXPORT_PRESETS } from "@/lib/video/presets";

/** GET /api/presets — return available platform export presets */
export async function GET() {
  return NextResponse.json({ presets: EXPORT_PRESETS });
}
