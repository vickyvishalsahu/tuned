# Tuned — Product & Technical Spec

## What is this?

A context-aware music app. One channel. No choices. Press play, something plays. The app reads your context and taste — you just listen.

Spotify is the jukebox. We own the brain.

---

## Core Principles

- **No choice** — the user never picks a song
- **No queue** — you don't know what's next
- **No skip** (v1) — you trust the station or you leave
- **Context-aware** — time, location, motion inform the selection
- **Taste-aware** — Spotify listening history shapes the palette
- **Beautiful and minimal** — this is a mood object, not a music app

---

## User Flow

```
1. Land on app → see a beautiful landing with one CTA: "Sign in with Spotify"
2. Spotify OAuth → Premium account required
3. First time: we fetch user's top artists, tracks, genres, saved tracks
4. Main screen: press Play
5. Music starts. Screen shows:
   - Album art (blurred as background + sharp in center)
   - Artist — Track name
   - A rotating quote (music/poetry/philosophy)
   - Subtle advancement bar (no timestamps)
   - Ambient background color shifts with track mood
6. Track ends → next track auto-plays (user never sees what's coming)
7. We create/update a "Tuned" playlist on their Spotify account
```

---

## Screens

### 1. Landing / Auth
- App name + tagline
- "Sign in with Spotify" button
- Minimal, dark, atmospheric

### 2. Player (the only real screen)
- Full-screen experience
- Album art — blurred background + centered artwork
- Track info — artist, track name (appears/fades gently)
- Quote — rotates every 30–60 seconds, music/poetry/philosophy quotes
- Progress bar — thin, subtle, no timestamps
- Background — slow color shift derived from album art dominant color
- No skip, no pause (v1 — revisit if it drives you insane)
- Maybe: a tiny weather/time icon in the corner as a wink that "we see you"

### 3. That's it
- No settings screen
- No history screen
- No profile screen
- If we need settings later, it's a single gear icon with minimal options

---

## Technical Architecture

### Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Auth**: Spotify OAuth 2.0 (PKCE flow)
- **Music Playback**: Spotify Web Playback SDK
- **Music Data**: Spotify Web API
- **Deployment**: Vercel
- **Package Manager**: pnpm

### Spotify Integration

**OAuth Scopes needed:**
- `user-read-private` — account info, premium check
- `user-top-read` — top artists, tracks
- `user-library-read` — saved tracks
- `user-read-recently-played` — recent listening
- `streaming` — Web Playback SDK
- `playlist-modify-public` or `playlist-modify-private` — create/update the Tuned playlist
- `user-read-playback-state` — current playback state

**API endpoints we'll use:**
- `GET /me` — verify premium
- `GET /me/top/artists` — taste profile (short, medium, long term)
- `GET /me/top/tracks` — taste profile
- `GET /me/player/recently-played` — recent context
- `GET /recommendations` — seed with top artists/genres + target attributes
- `POST /users/{id}/playlists` — create Tuned playlist
- `PUT /playlists/{id}/tracks` — update playlist
- `GET /audio-features/{id}` — energy, valence, tempo for context matching

### Context Engine (v1 — Rules Based)

The algo picks tracks by matching **context signals** to **audio feature targets** passed to Spotify's `/recommendations` endpoint.

**Inputs:**
| Signal | Source | Available in v1? |
|--------|--------|-------------------|
| Time of day | `new Date()` | ✅ |
| Day of week | `new Date()` | ✅ |
| Location | Geolocation API | ✅ (with permission) |
| Motion | DeviceMotion API | ⚠️ Web limited, better on native |
| Weather | Free weather API | ✅ (nice to have) |
| User taste | Spotify API | ✅ |

**Output — Spotify audio feature targets:**
| Context | Energy | Valence | Tempo | Acousticness |
|---------|--------|---------|-------|--------------|
| Weekday morning, stationary | 0.3–0.5 | 0.4–0.6 | 80–110 | 0.4–0.8 |
| Weekday morning, moving | 0.5–0.7 | 0.5–0.7 | 100–130 | 0.1–0.4 |
| Afternoon, working | 0.4–0.6 | 0.3–0.5 | 90–120 | 0.2–0.5 |
| Evening, home | 0.2–0.5 | 0.3–0.7 | 70–100 | 0.5–0.9 |
| Weekend night | 0.7–1.0 | 0.6–0.9 | 110–140 | 0.0–0.3 |
| Rainy + stationary | 0.1–0.4 | 0.2–0.5 | 60–90 | 0.6–1.0 |

These are starting points. We tune by living with it.

### Data Flow

```
User opens app
    ↓
Spotify OAuth → get access token
    ↓
Fetch user taste profile (top artists, genres, tracks)
    ↓
Read context (time, day, location, weather)
    ↓
Context Engine maps context → audio feature targets
    ↓
Call Spotify /recommendations with:
  - seed_artists (from user top artists)
  - seed_genres (from user top genres)
  - target_energy, target_valence, etc.
    ↓
Receive track list → queue first track via Web Playback SDK
    ↓
Track ends → pick next from recommendations (or fetch new batch)
    ↓
Add played tracks to "Tuned" playlist on user's Spotify
```

### Quotes System
- Simple JSON array of curated quotes
- Music, poetry, philosophy — no motivational Instagram garbage
- Rotate every 30–60 seconds with a fade transition
- Start with 50–100 hand-picked quotes
- Sources: Kerouac, Bukowski, Rumi, Murakami, Nick Cave, Patti Smith, Leonard Cohen, David Bowie, etc.

### Color System
- Extract dominant color from album art (use a canvas-based color extraction or a library)
- Apply as slow-transitioning background gradient
- Keep text always readable (ensure contrast)

---

## Project Structure

```
tuned/
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout, fonts, metadata
│   │   ├── page.tsx              # Landing page — auth CTA
│   │   ├── tuned/
│   │   │   └── page.tsx          # The player screen
│   │   └── api/
│   │       └── auth/
│   │           └── spotify/
│   │               ├── route.ts      # OAuth initiate
│   │               └── callback/
│   │                   └── route.ts  # OAuth callback
│   ├── components/
│   │   ├── Player.tsx            # Main player UI
│   │   ├── AlbumArt.tsx          # Album art + blurred background
│   │   ├── TrackInfo.tsx         # Artist + track name display
│   │   ├── Quote.tsx             # Rotating quote display
│   │   └── ProgressBar.tsx       # Thin progress bar
│   ├── lib/
│   │   ├── spotify/
│   │   │   ├── auth.ts           # OAuth helpers
│   │   │   ├── api.ts            # Spotify API calls
│   │   │   ├── player.ts         # Web Playback SDK wrapper
│   │   │   └── types.ts          # Spotify types
│   │   ├── engine/
│   │   │   ├── context.ts        # Read context signals (time, location, etc.)
│   │   │   ├── rules.ts          # Context → audio feature mapping rules
│   │   │   └── picker.ts         # Song selection logic
│   │   ├── quotes.ts             # Quotes data + rotation logic
│   │   └── colors.ts             # Album art color extraction
│   └── hooks/
│       ├── useSpotifyPlayer.ts   # Web Playback SDK hook
│       └── useContext.ts         # Context signals hook
├── public/
│   └── fonts/                    # Custom fonts if any
├── .env.local                    # Spotify client ID/secret
├── SPEC.md                       # This file
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

---

## Environment Variables

```env
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
NEXT_PUBLIC_APP_URL=
```

---

## What's NOT in v1

- No skip button (revisit if maddening)
- No pause button (revisit if maddening)
- No user accounts beyond Spotify OAuth
- No database — everything derived from Spotify + context at runtime
- No social features
- No sharing
- No native app
- No ML — rules engine only
- No multiple channels
- No offline mode

---

## Future (v2+)

- Native app (React Native or Swift) — proper motion/sensor access
- ML-based context engine — learn from what gets played vs abandoned
- Limited skips (3 per hour?) — lean-back-style
- Weather API integration
- "Mood nudge" — a single subtle control, like a warm/cool slider
- Multiple curated channels
- Guest curator mode
