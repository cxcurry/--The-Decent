"use client";
import { memo, useEffect, useRef } from "react";
// Original procedural artwork. No textures, remote assets, or animation libraries
// are needed for the environment; the game clock remains entirely independent.
function DescentScene({
  score,
  reduced,
  ambient = false,
}: {
  score: number;
  reduced: boolean;
  ambient?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({ target: score * 10, depth: score * 10, pointer: 0 });
  const paint = useRef<((time: number) => void) | null>(null);
  useEffect(() => {
    state.current.target = score * 10;
    if (reduced) {
      state.current.depth = score * 10;
      paint.current?.(0);
    }
  }, [score, reduced]);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const context = element.getContext("2d", { alpha: true });
    if (!context) return;
    const ctx = context;
    let width = 1,
      height = 1,
      frame = 0,
      last = 0,
      clock = 0,
      visible = true;
    const mobile = window.matchMedia("(max-width:760px)").matches;
    const count = ambient ? (mobile ? 14 : 30) : mobile ? 42 : 80;
    const noise = (n: number) => {
      const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return v - Math.floor(v);
    };
    const particles = Array.from({ length: count }, (_, i) => ({
      x: noise(i + 1) * 520,
      y: noise(i + 200) * 650,
      z: 0.3 + noise(i + 400) * 0.7,
      size: 0.45 + noise(i + 600) * 1.6,
    }));
    const glow = (
      x: number,
      y: number,
      r: number,
      color: string,
      alpha: number,
    ) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${color},${alpha})`);
      g.addColorStop(0.3, `rgba(${color},${alpha * 0.3})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    function draw(t: number) {
      const s = state.current;
      const dt = last && t > last ? Math.min(0.05, (t - last) / 1000) : 1 / 60;
      last = t;
      if (!reduced) {
        clock += dt;
        s.depth += (s.target - s.depth) * (1 - Math.exp(-dt * 2.7));
      } else {
        s.depth = s.target;
        clock = 0;
      }
      const travel = Math.abs(s.target - s.depth),
        deep = s.depth / 7000,
        hue = 211 + deep * 18;
      ctx.setTransform(element!.width / 520, 0, 0, element!.height / 650, 0, 0);
      ctx.clearRect(0, 0, 520, 650);
      const sky = ctx.createLinearGradient(0, 0, 0, 650);
      sky.addColorStop(0, `hsl(${hue} 67% ${ambient ? 7 : 12 - deep * 6}%)`);
      sky.addColorStop(
        0.5,
        `hsl(${hue + 6} 70% ${ambient ? 4 : 7 - deep * 3}%)`,
      );
      sky.addColorStop(1, "#02050c");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 520, 650);
      // Distant surface light and refracted shafts.
      glow(
        260 + s.pointer * 10,
        105,
        310,
        "55,123,255",
        (0.28 - deep * 0.12) * (ambient ? 0.5 : 1),
      );
      for (let i = 0; i < 4; i++) {
        const x = 100 + i * 110 + Math.sin(clock * 0.23 + i) * 22;
        const g = ctx.createLinearGradient(x, 0, x + 70, 550);
        g.addColorStop(0, `rgba(90,170,255,${0.075 - deep * 0.035})`);
        g.addColorStop(1, "rgba(54,123,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - 12, 0);
        ctx.lineTo(x + 8, 0);
        ctx.lineTo(x + 160, 600);
        ctx.lineTo(x + 20, 600);
        ctx.fill();
      }
      if (!ambient) {
        // Three parallax layers of the canyon. Rock seams drift upwards as you dive.
        for (let layer = 0; layer < 3; layer++) {
          const edge = 22 + layer * 22;
          for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(side < 0 ? 0 : 520, 0);
            for (let y = -60; y <= 750; y += 55) {
              const drift =
                (s.depth * (0.012 + layer * 0.006) + clock * (1 + layer)) % 55;
              const x =
                edge +
                noise(Math.floor(y / 55) + layer * 37 + (side + 1) * 20) * 38 +
                s.pointer * (layer + 1) * 2;
              ctx.lineTo(side < 0 ? x : 520 - x, y - drift);
            }
            ctx.lineTo(side < 0 ? 0 : 520, 650);
            ctx.closePath();
            ctx.fillStyle = `rgba(${5 + layer * 2},${14 + layer * 3},${27 + layer * 6},${0.9 - layer * 0.13})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(65,125,207,${0.11 + layer * 0.025})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
        // Sonar contours: displacement reflects real score-driven travel.
        for (let i = 0; i < 8; i++) {
          const y =
            70 + ((((i * 85 - s.depth * 0.18 - clock * 4) % 680) + 680) % 680);
          const r = 66 + y * 0.16;
          ctx.beginPath();
          ctx.ellipse(260 + s.pointer * 4, y, r, r * 0.18, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(66,141,255,${0.04 + (y / 650) * 0.11})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
      // Particles have their own depth and speed, producing genuine parallax.
      for (const p of particles) {
        const x = p.x + Math.sin(clock * 0.3 + p.y) * 5 + s.pointer * p.z * 12;
        const y =
          (((p.y - clock * (5 + p.z * 13) - s.depth * (0.3 + p.z * 0.5)) %
            650) +
            650) %
          650;
        ctx.fillStyle = `rgba(155,211,255,${0.12 + p.z * 0.42})`;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
        if (travel > 30 && !reduced) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + Math.min(40, travel * 0.15) * p.z);
          ctx.strokeStyle = `rgba(86,166,255,${0.08 + p.z * 0.17})`;
          ctx.lineWidth = p.size * 0.6;
          ctx.stroke();
        }
        if (p.size > 1.8 && !ambient) glow(x, y, 7, "78,165,255", 0.12);
      }
      if (!ambient) {
        // A small exploration probe, its searchlight, and an expanding sonar pulse.
        const x = 260 + s.pointer * 12 + Math.sin(clock * 0.65) * 4;
        const y = 218 + deep * 190 + Math.sin(clock * 0.9) * 4;
        glow(x, y + 120, 165, "54,123,255", 0.2);
        const lamp = ctx.createLinearGradient(x, y, x, y + 200);
        lamp.addColorStop(0, "rgba(120,200,255,.16)");
        lamp.addColorStop(1, "rgba(54,123,255,0)");
        ctx.fillStyle = lamp;
        ctx.beginPath();
        ctx.moveTo(x - 5, y + 17);
        ctx.lineTo(x - 70, y + 220);
        ctx.lineTo(x + 70, y + 220);
        ctx.lineTo(x + 5, y + 17);
        ctx.fill();
        const pulse = reduced ? 0.45 : (clock * 0.23) % 1;
        ctx.beginPath();
        ctx.ellipse(x, y, 24 + pulse * 90, 9 + pulse * 28, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(96,183,255,${(1 - pulse) * 0.45})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        glow(x, y - 3, 48, "100,182,255", 0.55);
        ctx.fillStyle = "#112b4d";
        ctx.strokeStyle = "#93d1ff";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y + 20);
        ctx.lineTo(x - 11, y - 2);
        ctx.lineTo(x - 8, y - 17);
        ctx.lineTo(x + 8, y - 17);
        ctx.lineTo(x + 11, y - 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#69baff";
        ctx.beginPath();
        ctx.moveTo(x - 10, y - 7);
        ctx.lineTo(x - 24, y - 15);
        ctx.lineTo(x - 19, y + 5);
        ctx.lineTo(x - 8, y + 2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 10, y - 7);
        ctx.lineTo(x + 24, y - 15);
        ctx.lineTo(x + 19, y + 5);
        ctx.lineTo(x + 8, y + 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#e7f6ff";
        ctx.beginPath();
        ctx.arc(x, y - 6, 3, 0, Math.PI * 2);
        ctx.fill();
        if (!reduced) {
          glow(x, y - 24, 18 + Math.min(28, travel * 0.03), "54,123,255", 0.35);
        }
        glow(260, 605, 115, "54,123,255", 0.18 + deep * 0.12);
        // Peripheral instrument marks stay outside the playable input panel.
        ctx.strokeStyle = "rgba(123,182,255,.2)";
        ctx.lineWidth = 0.7;
        for (const [mx, my, dx, dy] of [
          [115, 135, 1, 1],
          [405, 135, -1, 1],
          [115, 525, 1, -1],
          [405, 525, -1, -1],
        ]) {
          ctx.beginPath();
          ctx.moveTo(mx + dx * 17, my);
          ctx.lineTo(mx, my);
          ctx.lineTo(mx, my + dy * 17);
          ctx.stroke();
        }
      }
      const vignette = ctx.createRadialGradient(260, 320, 100, 260, 320, 390);
      vignette.addColorStop(0, "rgba(2,5,12,0)");
      vignette.addColorStop(1, "rgba(2,5,12,.85)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, 520, 650);
    }
    paint.current = draw;
    function resize() {
      const r = element!.getBoundingClientRect();
      width = r.width;
      height = r.height;
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
      element!.width = Math.max(1, Math.round(width * dpr));
      element!.height = Math.max(1, Math.round(height * dpr));
      draw(0);
    }
    let lastPaint = 0;
    function tick(t: number) {
      if (visible && !document.hidden && (!mobile || t - lastPaint >= 32)) {
        draw(t);
        lastPaint = t;
      }
      frame = requestAnimationFrame(tick);
    }
    const size = new ResizeObserver(resize);
    size.observe(element);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (!visible) last = 0;
    });
    intersection.observe(element);
    const pointer = (e: PointerEvent) => {
      if (reduced) return;
      const r = element!.getBoundingClientRect();
      state.current.pointer = Math.max(
        -1,
        Math.min(
          1,
          (e.clientX - r.left - r.width / 2) / Math.max(1, r.width / 2),
        ),
      );
    };
    if (!reduced) {
      window.addEventListener("pointermove", pointer, { passive: true });
      frame = requestAnimationFrame(tick);
    }
    resize();
    return () => {
      cancelAnimationFrame(frame);
      size.disconnect();
      intersection.disconnect();
      window.removeEventListener("pointermove", pointer);
      paint.current = null;
    };
  }, [reduced, ambient]);
  return (
    <canvas
      ref={canvas}
      className={ambient ? "ambient-scene" : "descent-scene"}
      aria-hidden="true"
    />
  );
}
export default memo(DescentScene);
