import { describe, it, expect } from 'vitest'
import { _bestMatch } from './spotify'

// Minimal fixture for a Spotify search result
const makeTrack = (id: string, artistName: string, trackName: string) => ({
  id,
  name: trackName,
  duration_ms: 200000,
  preview_url: null,
  artists: [{ name: artistName }],
  album: { name: 'Some Album', images: [{ url: 'https://example.com/art.jpg' }] },
})

describe('_bestMatch', () => {
  it('returns exact match on artist + title', () => {
    const results = [makeTrack('1', 'Radiohead', 'Creep')]
    const match = _bestMatch(results, 'Radiohead', 'Creep')
    expect(match?.id).toBe('1')
  })

  it('matches title with "(Remastered 2011)" suffix', () => {
    const results = [makeTrack('2', 'Nirvana', 'Come as You Are (Remastered 2011)')]
    const match = _bestMatch(results, 'Nirvana', 'Come as You Are')
    expect(match?.id).toBe('2')
  })

  it('matches title with "feat. someone" in it', () => {
    const results = [makeTrack('3', 'Jay-Z', 'Empire State of Mind feat. Alicia Keys')]
    const match = _bestMatch(results, 'Jay-Z', 'Empire State of Mind')
    expect(match?.id).toBe('3')
  })

  it('matches title with "ft." variant', () => {
    const results = [makeTrack('4', 'Drake', 'Crew Love ft. The Weeknd')]
    const match = _bestMatch(results, 'Drake', 'Crew Love')
    expect(match?.id).toBe('4')
  })

  it('handles special characters in artist name — AC/DC', () => {
    // "/" is stripped from both sides during normalization, so "ACDC" matches "ACDC"
    const results = [makeTrack('5', 'AC/DC', 'Highway to Hell')]
    const match = _bestMatch(results, 'AC/DC', 'Highway to Hell')
    expect(match?.id).toBe('5')
  })

  it('returns null when results array is empty', () => {
    expect(_bestMatch([], 'Artist', 'Title')).toBeNull()
  })

  it('returns null when no result passes the score threshold', () => {
    // Artist matches but title is completely different — score = 2... actually let's make both wrong
    const results = [makeTrack('6', 'Wrong Artist', 'Wrong Title')]
    expect(_bestMatch(results, 'Radiohead', 'Creep')).toBeNull()
  })

  it('returns highest scorer among multiple results', () => {
    const results = [
      makeTrack('a', 'Radiohead', 'Creep (Acoustic)'), // partial title match — score 3
      makeTrack('b', 'Radiohead', 'Creep'),             // exact — score 4
      makeTrack('c', 'Wrong Band', 'Creep'),             // artist mismatch — score 2 (title exact only)
    ]
    const match = _bestMatch(results, 'Radiohead', 'Creep')
    expect(match?.id).toBe('b')
  })

  it('artist name ordering mismatch ("The Beatles" vs "Beatles") — partial match via includes', () => {
    // "beatles" includes "beatles", "the beatles" includes "beatles" — so 1 pt for artist
    // Title exact — 2 pts. Total 3 — above threshold, returns it.
    // Limitation: reversed order ("Beatles, The") would not match via simple includes.
    const results = [makeTrack('7', 'The Beatles', 'Hey Jude')]
    const match = _bestMatch(results, 'Beatles', 'Hey Jude')
    expect(match?.id).toBe('7')
  })

  it('documents limitation: "Beatles, The" ordering does NOT match "The Beatles"', () => {
    // "beatles the" does not include "the beatles" and vice versa — score stays at 0 for artist
    // Title still matches — score 2, which meets threshold
    const results = [makeTrack('8', 'Beatles, The', 'Hey Jude')]
    const match = _bestMatch(results, 'The Beatles', 'Hey Jude')
    // Score: artist = 0 (neither includes the other cleanly), title exact = 2 → total 2 → passes threshold
    // So it returns a match on title alone. Document: artist order inversion is a known limitation.
    expect(match?.id).toBe('8') // passes only because title carries it
  })
})
