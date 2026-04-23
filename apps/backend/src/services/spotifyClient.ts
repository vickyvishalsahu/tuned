import { PrismaClient } from "@prisma/client";
import type { SpotifyTokenResponse, SpotifyRefreshResponse, SpotifyUser } from "../types/index.js";

const SPOTIFY_ACCOUNTS_URL = "https://accounts.spotify.com";
const SPOTIFY_API_URL = "https://api.spotify.com/v1";

const SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-top-read",
  "user-read-recently-played",
  "playlist-modify-public",
  "user-library-read",
].join(" ");

const clientId = process.env.SPOTIFY_CLIENT_ID!;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
const redirectUri = process.env.SPOTIFY_REDIRECT_URI!;

const basicAuth = () =>
  Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

export const spotifyClient = {
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: SCOPES,
      redirect_uri: redirectUri,
      state,
    });
    return `${SPOTIFY_ACCOUNTS_URL}/authorize?${params.toString()}`;
  },

  async exchangeCode(code: string): Promise<SpotifyTokenResponse> {
    const res = await fetch(`${SPOTIFY_ACCOUNTS_URL}/api/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Spotify token exchange failed ${res.status}: ${text}`);
    }

    return res.json() as Promise<SpotifyTokenResponse>;
  },

  async refreshAccessToken(userId: string, prisma: PrismaClient): Promise<string> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const res = await fetch(`${SPOTIFY_ACCOUNTS_URL}/api/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: user.refreshToken,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Spotify token refresh failed ${res.status}: ${text}`);
    }

    const data = (await res.json()) as SpotifyRefreshResponse;
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? user.refreshToken,
        tokenExpiresAt: expiresAt,
      },
    });

    return data.access_token;
  },

  async getTokenForUser(userId: string, prisma: PrismaClient): Promise<string> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const expiresInMs = user.tokenExpiresAt.getTime() - Date.now();
    if (expiresInMs <= 60_000) {
      return spotifyClient.refreshAccessToken(userId, prisma);
    }

    return user.accessToken;
  },

  async getCurrentUser(accessToken: string): Promise<SpotifyUser> {
    const res = await fetch(`${SPOTIFY_API_URL}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Spotify /me failed ${res.status}: ${text}`);
    }

    return res.json() as Promise<SpotifyUser>;
  },
};
