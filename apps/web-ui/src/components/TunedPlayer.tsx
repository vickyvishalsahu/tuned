"use client";

import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer";
import type { Quote } from "@/lib/types";
import Player from "./Player";

type TTunedPlayerProps = {
  quotes: Quote[];
};

export default function TunedPlayer({ quotes }: TTunedPlayerProps) {
  const { track, position, duration, paused, isLoading, error, next, togglePlay } =
    useSpotifyPlayer();

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6 text-center">
        <p className="font-display text-xl font-light text-white/40">SDK error: {error}</p>
      </div>
    );
  }

  const progress = duration > 0 ? position / duration : 0;

  return (
    <Player
      track={isLoading ? null : track}
      quotes={quotes}
      progress={progress}
      paused={paused}
      onTogglePlay={togglePlay}
      onNext={next}
    />
  );
}
