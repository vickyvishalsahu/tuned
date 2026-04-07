"use client";

import { useState, useEffect } from "react";

function getTimeIcon(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "☀️";
  if (hour >= 12 && hour < 17) return "🌤";
  if (hour >= 17 && hour < 21) return "🌅";
  return "🌙";
}

export default function ContextBadge() {
  const [icon, setIcon] = useState("");

  useEffect(() => {
    setIcon(getTimeIcon());
    const interval = setInterval(() => setIcon(getTimeIcon()), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!icon) return null;

  return (
    <div className="fixed right-4 top-4 text-base opacity-20 select-none">
      {icon}
    </div>
  );
}
