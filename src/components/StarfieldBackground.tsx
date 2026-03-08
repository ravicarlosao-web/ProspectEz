import { useMemo } from "react";

interface StarfieldBackgroundProps {
  count?: number;
}

export function StarfieldBackground({ count = 80 }: StarfieldBackgroundProps) {
  const dots = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 1,
      twinkleDuration: `${Math.random() * 4 + 2}s`,
      twinkleDelay: `${Math.random() * 5}s`,
      floatDuration: `${Math.random() * 8 + 4}s`,
      floatDelay: `${Math.random() * 4}s`,
      opacity: Math.random() * 0.5 + 0.1,
    }));
  }, [count]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {dots.map((dot) => (
        <div
          key={dot.id}
          className="absolute rounded-full bg-foreground/20 starfield-dot float-particle"
          style={{
            left: dot.left,
            top: dot.top,
            width: `${dot.size}px`,
            height: `${dot.size}px`,
            opacity: dot.opacity,
            ["--twinkle-duration" as string]: dot.twinkleDuration,
            ["--twinkle-delay" as string]: dot.twinkleDelay,
            ["--float-duration" as string]: dot.floatDuration,
            ["--float-delay" as string]: dot.floatDelay,
          }}
        />
      ))}
      {/* Subtle radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(142_70%_45%/0.03),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(205_80%_55%/0.02),transparent_60%)]" />
    </div>
  );
}
