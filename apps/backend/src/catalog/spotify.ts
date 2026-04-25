import { PrismaClient } from '@prisma/client'
import { spotifyClient } from '../services/spotifyClient'
import type { MusicCatalog, PlayableTrack } from './types'

const SPOTIFY_API_URL = 'https://api.spotify.com/v1'

// Strings we strip from titles before matching — order matters, longest first
const FEAT_PATTERNS = ['featuring', 'feat.', 'ft.']
const SUFFIX_PATTERNS = ['(remastered', '(deluxe edition', '(live)']

type SpotifySearchTrack = {
  id: string
  name: string
  duration_ms: number
  preview_url: string | null
  artists: Array<{ name: string }>
  album: { name: string; images: Array<{ url: string }> }
}

// Strips featured artist segments and parenthetical suffixes from a title.
const cleanTitle = (title: string): string => {
  let result = title.toLowerCase().replace(/&/g, 'and')
  // Strip feat/featuring from the title (e.g. "Song feat. Artist")
  for (const pattern of FEAT_PATTERNS) {
    const idx = result.indexOf(pattern)
    if (idx !== -1) result = result.slice(0, idx)
  }
  // Strip known suffixes like "(Remastered 2011)", "(Deluxe Edition)", "(Live)"
  for (const pattern of SUFFIX_PATTERNS) {
    const idx = result.indexOf(pattern)
    if (idx !== -1) result = result.slice(0, idx)
  }
  // Remove remaining punctuation and collapse whitespace
  return result.replace(/[^\w\s]/g, '').trim()
}

const cleanArtist = (artist: string): string =>
  artist.toLowerCase().replace(/&/g, 'and').replace(/[^\w\s]/g, '').trim()

const score = (candidate: SpotifySearchTrack, targetArtist: string, targetTitle: string): number => {
  const candidateArtist = cleanArtist(candidate.artists[0]?.name ?? '')
  const candidateTitle  = cleanTitle(candidate.name)
  const normTargetArtist = cleanArtist(targetArtist)
  const normTargetTitle  = cleanTitle(targetTitle)

  let pts = 0
  if (candidateArtist === normTargetArtist)          pts += 2
  else if (candidateArtist.includes(normTargetArtist) || normTargetArtist.includes(candidateArtist)) pts += 1

  if (candidateTitle === normTargetTitle)            pts += 2
  else if (candidateTitle.includes(normTargetTitle) || normTargetTitle.includes(candidateTitle))     pts += 1

  return pts
}

// Scores each result against target artist + title. Returns the best match
// above threshold (score >= 2), or null if none qualify.
export const bestMatch = (
  results: SpotifySearchTrack[],
  targetArtist: string,
  targetTitle: string,
): SpotifySearchTrack | null => {
  let best: SpotifySearchTrack | null = null
  let bestScore = 0

  for (const result of results) {
    const pts = score(result, targetArtist, targetTitle)
    if (pts > bestScore) {
      bestScore = pts
      best = result
    }
  }

  return bestScore >= 2 ? best : null
}

export const createSpotifyMusicCatalog = (userId: string, prisma: PrismaClient): MusicCatalog => ({
  async search(artist, title) {
    const token = await spotifyClient.getTokenForUser(userId, prisma)

    const query = `track:"${title}" artist:"${artist}"`
    const url   = `${SPOTIFY_API_URL}/search?q=${encodeURIComponent(query)}&type=track&limit=5`

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Spotify search failed ${res.status}: ${text}`)
    }

    const data = await res.json() as { tracks: { items: SpotifySearchTrack[] } }
    const match = bestMatch(data.tracks.items, artist, title)
    if (!match) return null

    return {
      trackId:     match.id,
      trackName:   match.name,
      artistName:  match.artists[0]?.name ?? '',
      albumName:   match.album.name,
      albumArtUrl: match.album.images[0]?.url ?? '',
      durationMs:  match.duration_ms,
      previewUrl:  match.preview_url,
    }
  },
})
