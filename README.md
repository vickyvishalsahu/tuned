# Radio

**One channel. No choices. Just listen.**

Radio is a context-aware music player that reads your moment — time of day, where you are, how you're moving — and plays music that fits. No playlists. No algorithms you have to train. No infinite scroll of options. You press play, and the right thing happens.

Built on Spotify. Requires a Premium account.

---

## How it works

1. Sign in with Spotify
2. Radio reads your listening history and current context
3. Press play
4. Music starts. You don't pick what's next — we do.

Every track played is saved to a **Radio** playlist on your Spotify account.

## The player

The interface is one screen. Full-screen, ambient, designed to disappear.

- Album art with a slow-shifting color backdrop
- Artist and track name, nothing else
- A thin progress bar with no timestamps
- Rotating quotes — music, poetry, philosophy
- A subtle context badge that hints at what Radio sees

No skip button. No queue. No settings. This is a mood object, not a music app.

## Context engine

Radio uses simple signals to shape what plays:

| Signal | Example |
|--------|---------|
| Time of day | Slow mornings, energetic afternoons |
| Day of week | Weekday focus vs. weekend night energy |
| Location | Home, commuting, somewhere new |
| Weather | Rain shifts things down, sun opens them up |

These signals map to Spotify's audio features — energy, valence, tempo, acousticness — and combine with your taste profile to generate recommendations that feel right without you lifting a finger.

## Setup

```bash
pnpm install
```

Create a `.env.local` file:

```
SPOTIFY_CLIENT_ID=<your-spotify-app-client-id>
SPOTIFY_CLIENT_SECRET=<your-spotify-app-client-secret>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

You'll need a [Spotify Developer App](https://developer.spotify.com/dashboard) with `http://localhost:3000/api/auth/spotify/callback` added as a redirect URI.

```bash
pnpm dev
```

Open [localhost:3000](http://localhost:3000).

## Stack

Next.js 15 / React 19 / TypeScript / Tailwind CSS / Spotify Web Playback SDK

## Status

Early MVP. The player UI is built. Spotify auth flow is wired. The context engine and live playback integration are next.
