"use client";

import { useState, useEffect } from "react";
import type { Track, Quote, DominantColor } from "@/lib/types";
import { extractDominantColor } from "@/lib/colors";
import AlbumArt from "./AlbumArt";
import TrackInfo from "./TrackInfo";
import QuoteRotator from "./QuoteRotator";
import ProgressBar from "./ProgressBar";
import ContextBadge from "./ContextBadge";
import SpotifyAttribution from "./SpotifyAttribution";

const DEFAULT_COLOR: DominantColor = { r: 30, g: 20, b: 40 };

interface PlayerProps {
  track: Track | null;
  quotes: Quote[];
}

export default function Player({ track, quotes }: PlayerProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dominantColor, setDominantColor] = useState<DominantColor>(DEFAULT_COLOR);

  // Extract dominant color from album art
  useEffect(() => {
    if (!track) return;
    setDominantColor(DEFAULT_COLOR);
    extractDominantColor(track.albumArtUrl).then(setDominantColor);
  }, [track?.albumArtUrl]);

  // Simulate playback progress
  useEffect(() => {
    if (!track) return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 1) return 0;
        return prev + 1 / (track.durationMs / 1000);
      });
    }, 1_000);
    return () => clearInterval(interval);
  }, [track?.id, track?.durationMs]);

  if (!track) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-surface">
        <p className="font-display text-xl font-light text-white/40">
          Tuning in...
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-surface">
      {/* Color tint layer */}
      <div
        className="pointer-events-none absolute inset-0 transition-colors duration-[3000ms] ease-in-out"
        style={{
          backgroundColor: `rgb(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b})`,
          mixBlendMode: "soft-light",
          opacity: 0.2,
        }}
      />

      {/* Album art (background blur + centered sharp) */}
      <AlbumArt
        src={track.albumArtUrl}
        alt={`${track.title} by ${track.artist}`}
        isTransitioning={isTransitioning}
      />

      {/* Track info */}
      <TrackInfo
        title={track.title}
        artist={track.artist}
        isTransitioning={isTransitioning}
      />

      {/* Quote */}
      <div className="absolute bottom-24 left-0 right-0 flex justify-center">
        <QuoteRotator quotes={quotes} />
      </div>

      {/* Context badge */}
      <ContextBadge />

      {/* Spotify attribution */}
      <SpotifyAttribution />

      {/* Progress bar */}
      <ProgressBar progress={progress} />
    </div>
  );
}
