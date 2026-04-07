"use client";

import { useState, useEffect, useCallback } from "react";
import type { Quote } from "@/lib/types";

interface QuoteRotatorProps {
  quotes: Quote[];
}

export default function QuoteRotator({ quotes }: QuoteRotatorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const rotateQuote = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentIndex((prev) => {
        let next = Math.floor(Math.random() * quotes.length);
        while (next === prev && quotes.length > 1) {
          next = Math.floor(Math.random() * quotes.length);
        }
        return next;
      });
      setIsVisible(true);
    }, 800);
  }, [quotes.length]);

  useEffect(() => {
    const interval = setInterval(rotateQuote, 30_000 + Math.random() * 30_000);
    return () => clearInterval(interval);
  }, [rotateQuote]);

  const quote = quotes[currentIndex];
  if (!quote) return null;

  return (
    <div className="max-w-md px-6 text-center">
      <p
        className={`font-display text-sm italic leading-relaxed text-white/40 transition-opacity duration-700 ease-in-out md:text-base ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        &ldquo;{quote.text}&rdquo;
      </p>
      <p
        className={`mt-2 font-body text-xs text-white/25 transition-opacity duration-700 ease-in-out ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        — {quote.author}
      </p>
    </div>
  );
}
