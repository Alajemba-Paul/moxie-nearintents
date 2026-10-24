import { useEffect, useRef } from "react";

export function ParticleOrb({ className, disperse = false }: { className?: string; disperse?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const points = Array.from({ length: 320 }, (_, index) => {
      const y = 1 - (index / 319) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = Math.PI * (3 - Math.sqrt(5)) * index;
      return { y, radius, theta };
    });
    let frame = 0;
    let raf = 0;

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const spin = reduce ? 0.8 : frame * 0.007;
      const cx = width / 2;
      const cy = height / 2;
      const fade = disperse ? Math.max(0.15, 1 - frame / 140) : 1;
      const scale = Math.min(width, height) * 0.36 * (disperse ? 1 + Math.min(frame, 90) / 90 : 1);
      for (const point of points) {
        const x = Math.cos(point.theta + spin) * point.radius;
        const z = Math.sin(point.theta + spin) * point.radius;
        const depth = (z + 1) / 2;
        ctx.fillStyle = depth > 0.72 ? "#ffffff" : depth > 0.4 ? "#479ffa" : "#ffa16c";
        ctx.globalAlpha = fade * (0.3 + depth * 0.7);
        ctx.beginPath();
        ctx.arc(cx + x * scale, cy + point.y * scale, 1 + depth * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      frame += 1;
      if (!reduce) raf = window.requestAnimationFrame(draw);
    };

    draw();
    return () => window.cancelAnimationFrame(raf);
  }, [disperse]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label="Slowly rotating sphere of teal, foam, and white points"
      className={className}
    />
  );
}
