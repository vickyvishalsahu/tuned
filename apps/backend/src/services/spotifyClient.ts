import { PrismaClient } from "@prisma/client";
import type { SpotifyTokenResponse, SpotifyRefreshResponse, SpotifyUser } from "../types/index.js";
import type { CandidateTrack, TrackFeatures } from "../types/profile.js";

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

  async getTopArtists(token: string): Promise<SpotifyArtist[]> {
    const res = await spotifyGet(token, '/me/top/artists?limit=20&time_range=medium_term');
    const data = await res.json() as { items: SpotifyArtist[] };
    return data.items;
  },

  async getTopTracks(token: string): Promise<SpotifyTrack[]> {
    const res = await spotifyGet(token, '/me/top/tracks?limit=50&time_range=medium_term');
    const data = await res.json() as { items: SpotifyTrack[] };
    return data.items;
  },

  async getRecentlyPlayed(token: string): Promise<SpotifyTrack[]> {
    const res = await spotifyGet(token, '/me/player/recently-played?limit=50');
    const data = await res.json() as { items: Array<{ track: SpotifyTrack }> };
    return data.items.map(item => item.track);
  },

  async getSavedTracks(token: string): Promise<SpotifyTrack[]> {
    const res = await spotifyGet(token, '/me/tracks?limit=50');
    const data = await res.json() as { items: Array<{ track: SpotifyTrack }> };
    return data.items.map(item => item.track);
  },

  async getAudioFeatures(token: string, trackIds: string[]): Promise<Map<string, TrackFeatures>> {
    const result = new Map<string, TrackFeatures>();
    // Batch in groups of 100 (Spotify max)
    for (let i = 0; i < trackIds.length; i += 100) {
      const batch = trackIds.slice(i, i + 100);
      const res = await spotifyGet(token, `/audio-features?ids=${batch.join(',')}`);
      const data = await res.json() as { audio_features: Array<SpotifyAudioFeature | null> };
      for (const feat of data.audio_features) {
        if (!feat) continue;
        result.set(feat.id, {
          energy: feat.energy,
          valence: feat.valence,
          tempo: feat.tempo,
          acousticness: feat.acousticness,
          instrumentalness: feat.instrumentalness,
          danceability: feat.danceability,
          loudness: feat.loudness,
        });
      }
    }
    return result;
  },

  async getRecommendations(token: string, params: RecommendationParams): Promise<SpotifyTrack[]> {
    const query = new URLSearchParams({
      limit: String(params.limit ?? 100),
      ...(params.seedArtists?.length ? { seed_artists: params.seedArtists.join(',') } : {}),
      ...(params.seedGenres?.length ? { seed_genres: params.seedGenres.join(',') } : {}),
      ...(params.targetEnergy !== undefined ? { target_energy: String(params.targetEnergy) } : {}),
      ...(params.minEnergy !== undefined ? { min_energy: String(params.minEnergy) } : {}),
      ...(params.maxEnergy !== undefined ? { max_energy: String(params.maxEnergy) } : {}),
      ...(params.targetValence !== undefined ? { target_valence: String(params.targetValence) } : {}),
      ...(params.minValence !== undefined ? { min_valence: String(params.minValence) } : {}),
      ...(params.maxValence !== undefined ? { max_valence: String(params.maxValence) } : {}),
      ...(params.targetTempo !== undefined ? { target_tempo: String(params.targetTempo) } : {}),
      ...(params.targetAcousticness !== undefined ? { target_acousticness: String(params.targetAcousticness) } : {}),
    });

    const res = await spotifyGet(token, `/recommendations?${query.toString()}`);

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('Retry-After') ?? 1) * 1000;
      console.warn(`[spotify] rate limited — retrying after ${retryAfter}ms`);
      await sleep(retryAfter);
      const retry = await spotifyGet(token, `/recommendations?${query.toString()}`);
      if (!retry.ok) throw new Error(`Spotify /recommendations failed after retry: ${retry.status}`);
      const data = await retry.json() as { tracks: SpotifyTrack[] };
      return data.tracks;
    }

    if (!res.ok) throw new Error(`Spotify /recommendations failed: ${res.status}`);
    const data = await res.json() as { tracks: SpotifyTrack[] };
    return data.tracks;
  },
};

// --- internal helpers ---

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const spotifyGet = async (token: string, path: string): Promise<Response> => {
  const res = await fetch(`${SPOTIFY_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 429) return res; // caller handles rate limit
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify GET ${path} failed ${res.status}: ${text}`);
  }
  return res;
};

// --- Spotify API shapes ---

type SpotifyArtist = {
  id: string
  name: string
  genres: string[]
}

export type SpotifyTrack = {
  id: string
  name: string
  duration_ms: number
  popularity: number
  artists: Array<{ id: string; name: string }>
  album: { id: string; name: string; images: Array<{ url: string }> }
}

type SpotifyAudioFeature = {
  id: string
  energy: number
  valence: number
  tempo: number
  acousticness: number
  instrumentalness: number
  danceability: number
  loudness: number
}

type RecommendationParams = {
  seedArtists?: string[]
  seedGenres?: string[]
  limit?: number
  targetEnergy?: number
  minEnergy?: number
  maxEnergy?: number
  targetValence?: number
  minValence?: number
  maxValence?: number
  targetTempo?: number
  targetAcousticness?: number
}

// Re-export for use in poolService
export type { CandidateTrack };
