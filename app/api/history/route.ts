import { NextRequest } from "next/server";
import { historyFor } from "@/lib/game";
import { session, respond, errorResponse } from "@/lib/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const s = session(request);
    return respond({ history: historyFor(s.id) }, s, request);
  } catch (e) {
    return errorResponse(e);
  }
}
