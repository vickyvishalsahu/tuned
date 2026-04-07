export interface Track {
  id: string;
  title: string;
  artist: string;
  albumArtUrl: string;
  durationMs: number;
}

export interface Quote {
  text: string;
  author: string;
}

export interface DominantColor {
  r: number;
  g: number;
  b: number;
}
