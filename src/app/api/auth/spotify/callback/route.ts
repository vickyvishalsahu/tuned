import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens } from "@/lib/spotify/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("spotify_auth_state")?.value;

  // Clean up state cookie
  cookieStore.delete("spotify_auth_state");

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(new URL("/?error=state_mismatch", request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    cookieStore.set("spotify_access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokens.expires_in,
      path: "/",
    });

    cookieStore.set("spotify_refresh_token", tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return NextResponse.redirect(new URL("/radio", request.url));
  } catch {
    return NextResponse.redirect(new URL("/?error=token_exchange", request.url));
  }
}
