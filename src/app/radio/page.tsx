import type { Track } from "@/lib/types";
import { quotes } from "@/lib/quotes";
import Player from "@/components/Player";
import ErrorBoundary from "@/components/ErrorBoundary";

const MOCK_TRACK: Track = {
  id: "mock-1",
  title: "Evan Finds the Third Room",
  artist: "Khruangbin",
  albumArtUrl: "https://picsum.photos/640/640",
  durationMs: 228_000,
};

export default function RadioPage() {
  // TODO: check auth cookie, redirect to / if not authenticated
  return (
    <ErrorBoundary>
      <Player track={MOCK_TRACK} quotes={quotes} />
    </ErrorBoundary>
  );
}
