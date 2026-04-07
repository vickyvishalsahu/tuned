import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSpotifyAuthUrl } from "@/lib/spotify/auth";

export async function GET() {
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("spotify_auth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(getSpotifyAuthUrl(state));
}
