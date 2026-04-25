import type { ContextVector } from '../types/context.js'
import type { TasteProfile } from '../types/profile.js'

const ENERGY_LABELS = [
  { max: 0.3, label: 'calm and quiet' },
  { max: 0.6, label: 'moderate and relaxed' },
  { max: 0.8, label: 'energetic' },
  { max: 1.0, label: 'intense and driving' },
]

const VALENCE_LABELS = [
  { max: 0.3, label: 'melancholic and dark' },
  { max: 0.6, label: 'neutral' },
  { max: 0.8, label: 'positive and warm' },
  { max: 1.0, label: 'euphoric and uplifting' },
]

const ACOUSTICNESS_LABELS = [
  { max: 0.3, label: 'electronic and produced' },
  { max: 0.6, label: 'mixed' },
  { max: 1.0, label: 'acoustic and organic' },
]

const TEMPO_LABELS = [
  { max: 0.35, label: 'slow' },
  { max: 0.55, label: 'medium tempo' },
  { max: 0.75, label: 'upbeat' },
  { max: 1.0,  label: 'fast' },
]

const labelFor = (value: number, labels: Array<{ max: number; label: string }>): string =>
  labels.find(entry => value <= entry.max)?.label ?? labels[labels.length - 1]!.label

// Replace double quotes in user-supplied strings to avoid breaking the prompt.
const sanitize = (value: string): string => value.replace(/"/g, "'")

export const buildRecommendationPrompt = (cv: ContextVector, profile: TasteProfile): string => {
  const tf = cv.targetFeatures
  const energyMid       = (tf.energy[0] + tf.energy[1]) / 2
  const valenceMid      = (tf.valence[0] + tf.valence[1]) / 2
  const acousticnessMid = (tf.acousticness[0] + tf.acousticness[1]) / 2
  // Tempo range is BPM — normalize to 0–1 for label lookup (assume max 200 BPM)
  const tempoMid        = ((tf.tempo[0] + tf.tempo[1]) / 2) / 200

  const energyLabel       = labelFor(energyMid, ENERGY_LABELS)
  const valenceLabel      = labelFor(valenceMid, VALENCE_LABELS)
  const acousticnessLabel = labelFor(acousticnessMid, ACOUSTICNESS_LABELS)
  const tempoLabel        = labelFor(tempoMid, TEMPO_LABELS)

  const genres = profile.topGenres.map(sanitize).join(', ')

  const timeSlot = cv.timeSlot.replace('_', ' ')

  return `You are a music curator. Suggest 30 tracks that fit this exact moment.

Moment: ${timeSlot} on a ${cv.dayType}, ${cv.season}. Weather: ${cv.weatherMood}. Movement: ${cv.movementState}.
Target mood: ${energyLabel}, ${valenceLabel}, ${tempoLabel}, ${acousticnessLabel}.

User's taste: they listen to ${genres}.

Return ONLY a JSON array of objects. Each object must have exactly two string fields: "artist" and "title". No explanations. No markdown. Example: [{"artist":"Radiohead","title":"Exit Music (For a Film)"}]`
}
