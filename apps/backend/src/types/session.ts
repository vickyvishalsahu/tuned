export type RecentTrackEntry = {
  trackId: string
  artistId: string
  energy: number
  valence: number
  playedAt: number // epoch ms
}

export type SessionState = {
  sessionId: string
  userId: string
  recentTracks: RecentTrackEntry[] // last 10
  energyTrajectory: number[]        // last 5 energy values
}

export type ContinuityHint = {
  trackId: string
  trackName: string
  artistName: string
  reason: string
}
