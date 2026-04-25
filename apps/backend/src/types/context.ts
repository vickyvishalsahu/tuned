export type RawContext = {
  lat: number
  lng: number
  movementBpm: number | null
  deviceType: 'mobile' | 'desktop' | 'tablet'
  headphonesConnected: boolean
  localTimestamp: string // ISO 8601
}

export type FeatureRange = [number, number]

export type ContextVector = {
  timeSlot: 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night' | 'late_night'
  dayType: 'weekday' | 'weekend' | 'holiday'
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  movementState: 'still' | 'walking' | 'running' | 'transit'
  weatherMood: 'bright' | 'overcast' | 'rain' | 'storm' | 'snow' | 'unknown'
  newsSentiment: number // -1.0 to 1.0
  targetFeatures: {
    energy: FeatureRange
    valence: FeatureRange
    tempo: FeatureRange // BPM range, not normalized
    acousticness: FeatureRange
    instrumentalness: FeatureRange
    danceability: FeatureRange
  }
  discoveryWeight: number // 0.0 to 1.0
  locationIsNew: boolean
  rawSignals: Record<string, unknown>
}
