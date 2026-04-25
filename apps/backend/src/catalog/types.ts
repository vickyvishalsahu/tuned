export type PlayableTrack = {
  trackId:     string
  trackName:   string
  artistName:  string
  albumName:   string
  albumArtUrl: string
  durationMs:  number
  previewUrl:  string | null
}

export type MusicCatalog = {
  search(artist: string, title: string): Promise<PlayableTrack | null>
  getSavedTracks(): Promise<PlayableTrack[]>
}
