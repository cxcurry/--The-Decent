import { NextRequest } from "next/server";
import { gameState, GameError, type Action } from "@/lib/game";
import { session, respond, sameOrigin, errorResponse } from "@/lib/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const s = session(request);
    return respond(gameState(s.id), s, request);
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    if (Number(request.headers.get("content-length") || 0) > 2048)
      throw new GameError("Request is too large.", 413);
    const raw = await request.text();
    if (raw.length > 2048) throw new GameError("Request is too large.", 413);
    const body = JSON.parse(raw);
    if (
      !body ||
      !["start", "submit", "draft", "pass", "continue"].includes(body.action)
    )
      throw new GameError("Unknown game action.");
    if (
      body.text !== undefined &&
      (typeof body.text !== "string" || body.text.length > 120)
    )
      throw new GameError("Answers must be 120 characters or fewer.");
    if (
      body.action !== "start" &&
      (!Number.isInteger(body.round) || body.round < 1 || body.round > 7)
    )
      throw new GameError("A valid round number is required.");
    const s = session(request);
    return respond(
      gameState(s.id, body.action as Action, body.text ?? "", body.round),
      s,
      request,
    );
  } catch (e) {
    return errorResponse(e);
  }
}
