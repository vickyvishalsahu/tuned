# Radio — Context × Music Matrix

**Status**: Living document. Version 0.1 — simplified. Will be refined as we learn.  
**Owner**: Dolores  
**Purpose**: Define how real-world signals translate into music targets. This is Radio's proprietary intelligence layer.

---

## The Big Idea

Shazam listens to a song and finds it by matching its acoustic fingerprint — the pattern of beats, bass, frequencies — against a database. It works backwards: audio → identity.

Radio does the opposite. It reads your moment and works forwards: **context → acoustic fingerprint → find the right track.**

Instead of identifying a song from sound, we construct a "sound target" from your situation — and find a track that matches it.

That target is built from six acoustic dimensions:

| Dimension | What it means | Range |
|---|---|---|
| **Energy** | How intense and loud the track feels | 0 (whisper) → 1 (stadium) |
| **Valence** | Emotional colour — dark or bright | 0 (melancholic) → 1 (euphoric) |
| **Tempo** | Beats per minute — the pulse | 60 BPM (slow) → 180 BPM (sprint) |
| **Acousticness** | Organic vs electronic | 0 (synth) → 1 (acoustic guitar) |
| **Instrumentalness** | Vocals vs no vocals | 0 (all vocals) → 1 (pure instrumental) |
| **Bass weight** | Low-frequency presence — the thump | 0 (thin) → 1 (heavy bass) |

Every context signal nudges these dimensions up or down. The final target is where all signals agree — or where the stronger ones win.

---

## The Signals We Read

Ordered from strongest to weakest influence (this is the weighting hierarchy):

| Priority | Signal | Source | MVP? |
|---|---|---|---|
| 1 | Movement state | Device accelerometer / step count | — |
| 2 | Time of day | Device clock | ✅ via location timezone |
| 3 | Weather | Location → weather API | ✅ |
| 4 | Device + headphones | Device type, audio output | ✅ |
| 5 | Location novelty | Is this a new place? | ✅ |
| 6 | Day type | Weekday / weekend / holiday | — |
| 7 | Season | Location + date | — |
| 8 | News sentiment | Headlines → positive/negative score | — |

**MVP scope**: location (→ weather, time, novelty) + device. Everything else comes later.

---

## The Signal → Music Matrix

Each cell shows the target direction for that dimension given that signal.  
`↑` = push higher, `↓` = push lower, `~` = no strong opinion, `↕` = context-dependent.

### Time of Day

| Time | Energy | Valence | Tempo | Acousticness | Instrumentalness | Bass |
|---|---|---|---|---|---|---|
| Early morning (5–8am) | ↓ low | ~ neutral | ↓ slow | ↑ high | ↑ high | ↓ low |
| Morning (8–11am) | ~ medium | ↑ bright | ~ medium | ~ medium | ~ medium | ~ medium |
| Afternoon (11am–5pm) | ↑ high | ↑ bright | ↑ upbeat | ↓ low | ↓ low | ~ medium |
| Evening (5–9pm) | ~ medium | ↕ depends | ~ medium | ~ medium | ~ medium | ~ medium |
| Night (9pm–midnight) | ↓ low | ↓ darker | ↓ slow | ↑ high | ↑ high | ~ medium |
| Late night (midnight–5am) | ↓ very low | ↓ dark | ↓ very slow | ↑ very high | ↑ very high | ↓ low |

### Movement State

| Movement | Energy | Valence | Tempo | Acousticness | Instrumentalness | Bass |
|---|---|---|---|---|---|---|
| Still | ~ medium | ~ neutral | ~ medium | ↑ high | ↑ high | ↓ low |
| Walking | ~ medium | ↑ bright | ~ 90–110 BPM | ~ medium | ~ medium | ~ medium |
| Running | ↑ very high | ↑ high | ↑ 140–175 BPM | ↓ low | ↓ low | ↑ high |
| Transit / commute | ~ medium | ~ neutral | ~ medium | ↓ low | ↑ medium | ↑ medium |

### Weather

| Weather | Energy | Valence | Tempo | Acousticness | Instrumentalness | Bass |
|---|---|---|---|---|---|---|
| Bright / sunny | ↑ high | ↑ high | ↑ upbeat | ↓ low | ↓ low | ~ medium |
| Overcast | ~ medium | ~ neutral | ~ medium | ~ medium | ~ medium | ~ medium |
| Rain | ↓ low | ↓ darker | ↓ slow | ↑ high | ↑ high | ↓ low |
| Storm | ↕ dramatic | ↓ intense | ↕ varies | ↓ low | ↑ medium | ↑ high |
| Snow | ↓ low | ~ calm | ↓ slow | ↑ very high | ↑ high | ↓ low |

### Device + Headphones

| Context | Energy | Valence | Tempo | Acousticness | Instrumentalness | Bass |
|---|---|---|---|---|---|---|
| Mobile + headphones | ~ | ~ | ~ | ~ | ~ | ↑ slightly |
| Mobile + speaker | ↑ slightly | ↑ slightly | ↑ slightly | ~ | ↓ slightly | ↓ slightly |
| Desktop + headphones | ~ | ~ | ~ | ↑ slightly | ↑ slightly | ~ |
| Desktop + speaker | ~ | ~ | ~ | ~ | ~ | ~ |
| Tablet | ~ | ~ | ~ | ~ | ~ | ~ |

Device is a weak signal — it adjusts at the margin, never overrides stronger signals.

### Location Novelty

| Location | Energy | Valence | Notes |
|---|---|---|---|
| Familiar place | ~ | ~ | No adjustment |
| New place (>2km from known locations) | ↑ slightly | ↑ slightly | New environment → slight exploration boost |

---

## The Weight Formula

Each signal produces a suggested value for each dimension. The final target is a **weighted average**.

```
target_energy = (w1 × energy_from_movement + w2 × energy_from_weather + w3 × energy_from_time + ...) / (w1 + w2 + w3 + ...)
```

### Signal weights (MVP and full)

| Signal | MVP weight | Full weight |
|---|---|---|
| Movement state | — | 40 |
| Weather | 35 | 25 |
| Time of day | 40 | 20 |
| Device + headphones | 15 | 8 |
| Location novelty | 10 | 5 |
| Day type | — | 5 |
| Season | — | 3 |
| News sentiment | — | 2 |

Weights don't need to sum to 100 — they're relative. What matters is the ratio between them.

### Example: rainy Tuesday morning, mobile + headphones, familiar location

```
Energy target:
  Time (morning) suggests:  0.55  × weight 40 = 22.0
  Weather (rain) suggests:  0.30  × weight 25 = 7.5
  Device (mobile+hp) suggests: 0.55 × weight 8 = 4.4
  Total weight: 73
  → target_energy = (22.0 + 7.5 + 4.4) / 73 = 0.46
```

Result: low-medium energy. Calm, not dead. Makes sense for a rainy morning commute.

---

## The "Shazam Layer" — Audio DNA Targeting

Shazam builds a constellation map: peaks in the frequency spectrum plotted against time. Each peak is a coordinate. The combination is unique per song.

We don't identify — we **target**. But we use the same acoustic dimensions:

| Shazam cares about | Radio targets it as |
|---|---|
| Frequency peak density | → Instrumentalness (sparse = more instrumental) |
| Low-frequency peak strength | → Bass weight + Energy |
| Tempo / beat interval regularity | → Tempo (BPM) + Danceability |
| High-frequency brightness | → Acousticness (inverted — bright highs = less acoustic) |
| Overall amplitude envelope | → Energy + Loudness |

When we construct a target, we're building a "ghost fingerprint" — the acoustic shape of the moment. Then we find tracks whose real fingerprint is closest to it.

The scoring engine measures distance between the ghost fingerprint and each candidate track's real fingerprint across all dimensions. Closest match wins (with randomness to keep it interesting).

---

## MVP: What We Build First

Two signals only: **location** (→ weather + time of day) and **device**.

```
MVP target = weighted_average(
  time_of_day_vector   × 40,
  weather_vector       × 35,
  device_vector        × 15,
  location_novelty     × 10
)
```

This covers the most impactful signals. A rainy evening sounds different from a sunny morning — that's detectable with just location and a clock.

Movement (the strongest signal) comes next. It requires the frontend to send accelerometer or step data, which adds scope. Worth it — but phase 2.

---

## What This Enables

With this matrix fully built:

- A user sitting still in the rain at 11pm in a new city → calm, dark, atmospheric, instrumental
- A user running on a bright Saturday morning → high energy, euphoric, fast, bass-heavy
- A user at a desk on a Tuesday afternoon → medium energy, bright, focused, maybe slightly instrumental
- A user on a night train through mountains → medium energy, slightly melancholic, rich acoustics

No choices. No playlist. Just the right thing.

---

## What This Document Is NOT

This is not the implementation spec. It's the intelligence contract — the agreement between the real world and the music.

Miles handles implementation. Mr. Wolf handles architecture. This document tells them what the algorithm is supposed to *feel like* before they write a single line of code.

---

## Next Iterations

- v0.2: Add movement state signal + weights
- v0.3: Add taste profile influence (user history shifts the baseline)
- v0.4: Add feedback loop (completion rate adjusts weights per user)
- v1.0: Weights become user-specific, learned over time
