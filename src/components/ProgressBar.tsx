interface ProgressBarProps {
  progress: number; // 0 to 1
}

export default function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-[2px] bg-white/10">
      <div
        className="h-full bg-white/30 transition-[width] duration-1000 ease-linear"
        style={{ width: `${Math.min(progress * 100, 100)}%` }}
      />
    </div>
  );
}
