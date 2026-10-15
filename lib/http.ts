import { NextRequest, NextResponse } from "next/server";
import { GameError, identity } from "./game";
export const COOKIE = "core_session";
export function session(request: NextRequest) {
  return identity(request.cookies.get(COOKIE)?.value);
}
export function respond(
  data: unknown,
  s: ReturnType<typeof identity>,
  request: NextRequest,
) {
  const response = NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, private" },
  });
  if (s.fresh)
    response.cookies.set(COOKIE, s.token, {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production" &&
        request.nextUrl.protocol === "https:",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  return response;
}
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  let originHost: string | undefined;
  try {
    originHost = origin ? new URL(origin).host : undefined;
  } catch {
    /* malformed origins fail closed */
  }
  if (!originHost || originHost !== request.headers.get("host"))
    throw new GameError("This action must come from the game website.", 403);
}
export function errorResponse(error: unknown) {
  if (error instanceof GameError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  if (error instanceof SyntaxError)
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  console.error(
    "Game request failed:",
    error instanceof Error ? error.message : "Unknown error",
  );
  return NextResponse.json(
    { error: "The expedition is temporarily unavailable. Please try again." },
    { status: 500 },
  );
}
