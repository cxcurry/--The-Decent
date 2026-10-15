"use client";
import { memo, useEffect, useRef } from "react";
import { drawOceanWorld } from "./ocean-world";
import { oceanLayer } from "@/lib/ocean";
import {
  diveDepth,
  diveEnvelope,
  diveProgress,
  type DiveEvent,
} from "@/lib/dive";

// Original, resolution-independent procedural world. A single renderer spans the
// viewport; continuous vertical geography and wildlife share the same depth.
function DescentScene({
  score,
  reduced,
  active = false,
  dive = null,
}: {
  score: number;
  reduced: boolean;
  active?: boolean;
  dive?: DiveEvent | null;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({
    target: score * 10,
    depth: score * 10,
    x: 0,
    y: 0,
    active,
    boost: 0,
    dive: null as DiveEvent | null,
  });
  const paint = useRef<(() => void) | null>(null);
  useEffect(() => {
    const s = state.current;
    if (active && !s.active) s.boost = 1;
    s.active = active;
    if (dive && s.dive?.id !== dive.id) s.depth = dive.fromDepth;
    if ((!dive && s.dive) || (!dive && s.target !== score * 10))
      s.depth = score * 10;
    s.dive = dive;
    s.target = score * 10;
    if (reduced) {
      s.depth = s.target;
      paint.current?.();
    }
  }, [score, reduced, active, dive]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const context = element.getContext("2d", { alpha: false });
    if (!context) return;
    const ctx = context;
    let w = 1,
      h = 1,
      dpr = 1,
      frame = 0,
      last = 0,
      clock = 0,
      journey = 0;
    let lookX = 0,
      lookY = 0,
      lastPaint = 0,
      frameCost = 0,
      slowFrames = 0;
    let mobile = matchMedia("(max-width:760px)").matches;
    let interval = mobile ? 1000 / 30 : 1000 / 60;
    const noise = (n: number) => {
      const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return v - Math.floor(v);
    };
    const tau = Math.PI * 2;
    const mod = (n: number, m: number) => ((n % m) + m) % m;
    const particles = Array.from({ length: 260 }, (_, i) => ({
      x: noise(i + 1),
      y: noise(i + 390),
      z: 0.15 + noise(i + 780) * 0.85,
      r: 0.4 + noise(i + 1030) * 1.5,
    }));
    // Reuse radial light sprites instead of rebuilding hundreds of gradients
    // per frame. This keeps the richer scene responsive on software renderers.
    const lights = new Map<string, HTMLCanvasElement>();
    function glow(
      x: number,
      y: number,
      r: number,
      color: string,
      alpha: number,
    ) {
      if (r < 1) return;
      let light = lights.get(color);
      if (!light) {
        light = document.createElement("canvas");
        light.width = light.height = 128;
        const brush = light.getContext("2d")!;
        const g = brush.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, `rgba(${color},1)`);
        g.addColorStop(0.35, `rgba(${color},0.22)`);
        g.addColorStop(1, `rgba(${color},0)`);
        brush.fillStyle = g;
        brush.fillRect(0, 0, 128, 128);
        lights.set(color, light);
      }
      ctx.globalAlpha = alpha;
      ctx.drawImage(light, x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    }
    function path(
      points: number[][],
      fill: string | CanvasGradient,
      stroke?: string,
    ) {
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.stroke();
      }
    }
    function draw(t: number) {
      const started = performance.now();
      const s = state.current;
      const dt = last && t > last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      const progress = s.dive ? diveProgress(s.dive, performance.now()) : 1;
      const envelope = reduced ? 0 : diveEnvelope(progress);
      const intensity = s.dive?.profile.intensity ?? 0;
      const scatter = (s.dive?.profile.scatter ?? 0) * envelope;
      if (!reduced) {
        clock += dt;
        if (s.dive) s.depth = diveDepth(s.dive, performance.now());
        else s.depth += (s.target - s.depth) * (1 - Math.exp(-dt * 1.65));
        s.boost *= Math.exp(-dt * 0.7);
        lookX += (s.x - lookX) * (1 - Math.exp(-dt * 2));
        lookY += (s.y - lookY) * (1 - Math.exp(-dt * 2));
      } else {
        s.depth = s.target;
        clock = 0;
        journey = 0;
        lookX = lookY = 0;
      }
      const surge = reduced ? 0 : envelope * (0.35 + intensity * 2.2) + s.boost;
      if (!reduced) journey += dt * (0.09 + surge * 0.65);
      const accent = oceanLayer(s.depth).accent;
      const cx =
        w * (mobile ? 0.61 : 0.72) +
        lookX * 22 +
        Math.sin(clock * 0.17) * w * 0.012;
      const cy =
        h * (mobile ? 0.32 : 0.45) +
        lookY * 15 +
        Math.cos(clock * 0.21) * h * 0.012;
      const unit = Math.min(w, h);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#03111d";
      ctx.fillRect(0, 0, w, h);
      // A scored dive pushes and banks the world camera. Instruments stay still.
      ctx.save();
      const shake =
        (s.dive?.profile.shake ?? 0) * envelope * (mobile ? 0.6 : 1);
      ctx.translate(
        cx + Math.sin(clock * 73) * shake,
        cy + Math.cos(clock * 61) * shake * 0.7,
      );
      ctx.rotate(Math.sin(clock * 11) * 0.002 * surge);
      ctx.scale(1 + surge * 0.02, 1 + surge * 0.02);
      ctx.translate(-cx, -cy);
      drawOceanWorld(ctx, {
        width: w,
        height: h,
        depth: s.depth,
        origin: h * (mobile ? 0.27 : 0.44),
        clock,
        mobile,
        lookX,
        scatter,
        glow,
      });
      // Marine snow and bubbles. Their streak length follows the actual dive.
      for (const p of particles.slice(0, mobile ? 110 : 260)) {
        const px = mod(
          p.x * w + Math.sin(clock * 0.35 + p.y * 12) * 18 + lookX * p.z * 28,
          w,
        );
        const py = mod(
          p.y * h -
            clock * (12 + p.z * 32) -
            s.depth * (0.13 + p.z * 0.6) -
            journey * 90 * p.z,
          h,
        );
        const r = p.r * (0.5 + p.z) * (mobile ? 0.8 : 1);
        ctx.strokeStyle = `rgba(${accent},${0.16 + p.z * 0.36})`;
        ctx.lineWidth = Math.max(0.6, r * 0.55);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(
          px + (px - cx) * surge * 0.03,
          py + 3 + surge * (20 + p.z * 90),
        );
        ctx.stroke();
        if (p.z > 0.8) {
          ctx.beginPath();
          ctx.arc(px, py, r * 1.5, 0, tau);
          ctx.stroke();
        }
      }
      // The hero probe: metal hull, glass cockpit, articulated arms, counter-
      // rotating thrusters, cables and lights. It floats over the shared world.
      const px =
        w * (mobile ? 0.64 : 0.73) + lookX * 16 + Math.sin(clock * 0.6) * 12;
      const py =
        h * (mobile ? 0.27 : 0.44) +
        lookY * 10 +
        Math.cos(clock * 0.8) * 14 +
        envelope * (12 + intensity * 30) +
        s.boost * 12;
      const size = Math.min(mobile ? 0.7 : 1.35, unit / 620);
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(size, size);
      ctx.rotate(
        Math.sin(clock * 0.37) * 0.07 +
          lookX * 0.025 +
          envelope * intensity * 0.18,
      );
      // Tether disappears into the surface above the frame.
      ctx.beginPath();
      ctx.moveTo(0, -45);
      ctx.bezierCurveTo(-100, -230, 90, -340, -45, -h / size);
      ctx.strokeStyle = "#1b637b";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = "#87c9ce50";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      glow(0, 40, 230, accent, 0.38 + surge * 0.12);
      // Searchlights sweep the cavern rather than staying attached to a flat box.
      ctx.globalCompositeOperation = "screen";
      for (const side of [-1, 1]) {
        const sweep = Math.sin(clock * 0.45 + side) * 80;
        const beam = ctx.createLinearGradient(
          side * 45,
          24,
          side * 155 + sweep,
          410,
        );
        beam.addColorStop(0, "rgba(176,249,255,.27)");
        beam.addColorStop(1, "rgba(82,193,255,0)");
        path(
          [
            [side * 45 - 5, 24],
            [side * 45 + 5, 24],
            [side * 155 + sweep + 110, 410],
            [side * 155 + sweep - 110, 410],
          ],
          beam,
        );
      }
      ctx.globalCompositeOperation = "source-over";
      // Sonar rings expand through the scene; score surges accelerate the sweep.
      for (let i = 0; i < 3; i++) {
        const p = reduced
          ? (i + 1) / 4
          : mod(clock * 0.17 + i / 3 + journey * 0.08, 1);
        ctx.beginPath();
        ctx.ellipse(0, 30 + p * 90, 80 + p * 330, 30 + p * 135, 0, 0, tau);
        ctx.strokeStyle = `rgba(${accent},${(1 - p) * 0.34})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }
      for (const side of [-1, 1]) {
        // Outrigger arms and articulated pincers.
        path(
          [
            [side * 28, -15],
            [side * 73, 1],
            [side * 82, 43],
            [side * 68, 42],
            [side * 58, 12],
            [side * 24, 4],
          ],
          "#102d40",
          "#70adbd",
        );
        ctx.beginPath();
        ctx.moveTo(side * 77, 40);
        ctx.lineTo(side * 91, 58 + Math.sin(clock * 0.9) * 3);
        ctx.lineTo(side * 83, 66);
        ctx.strokeStyle = "#73a5b5";
        ctx.lineWidth = 3;
        ctx.stroke();
        const engine = ctx.createLinearGradient(
          side * 60 - 13,
          0,
          side * 60 + 13,
          0,
        );
        engine.addColorStop(0, "#08141f");
        engine.addColorStop(0.5, "#3a6373");
        engine.addColorStop(1, "#0b1b2b");
        ctx.fillStyle = engine;
        ctx.fillRect(side * 60 - 12, -28, 24, 43);
        ctx.strokeStyle = "#83c3d4";
        ctx.lineWidth = 1;
        ctx.strokeRect(side * 60 - 12, -28, 24, 43);
        glow(side * 60, -30, 29 + surge * 14, accent, 0.7);
        ctx.save();
        ctx.translate(side * 60, -12);
        ctx.rotate(clock * side * (6 + surge * 15));
        for (let blade = 0; blade < 4; blade++) {
          ctx.rotate(Math.PI / 2);
          path(
            [
              [0, 0],
              [4, -14],
              [-4, -11],
            ],
            "#93dce68c",
          );
        }
        ctx.restore();
        for (let i = 0; i < 10; i++) {
          const p = mod(clock * (0.45 + surge * 0.5) + i / 10, 1);
          const x = side * 60 + Math.sin(i + clock) * p * 15,
            y = -30 - p * (95 + surge * 90);
          ctx.beginPath();
          ctx.arc(x, y, 1 + p * 2, 0, tau);
          ctx.strokeStyle = `rgba(${accent},${(1 - p) * 0.6})`;
          ctx.stroke();
        }
      }
      const hull = ctx.createLinearGradient(-35, -35, 40, 55);
      hull.addColorStop(0, "#6d99a6");
      hull.addColorStop(0.28, "#233e51");
      hull.addColorStop(0.7, "#0c2034");
      hull.addColorStop(1, "#528396");
      path(
        [
          [0, -57],
          [-30, -32],
          [-39, 12],
          [-25, 44],
          [0, 62],
          [25, 44],
          [39, 12],
          [30, -32],
        ],
        hull,
        "#7fbccc",
      );
      path(
        [
          [-25, -20],
          [-17, -38],
          [17, -38],
          [25, -20],
          [20, 8],
          [-20, 8],
        ],
        "#032230",
        "#9ce9ed",
      );
      glow(0, -17, 25, accent, 0.6);
      path(
        [
          [-17, -31],
          [12, -31],
          [-9, -10],
          [-19, -10],
        ],
        "#a6f8ff38",
      );
      ctx.strokeStyle = "#5c8697";
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-15, 19 + i * 6);
        ctx.lineTo(15, 19 + i * 6);
        ctx.stroke();
      }
      ctx.fillStyle = "#d1fcff";
      for (const side of [-1, 1]) {
        ctx.fillRect(side * 28 - 4, 15, 8, 5);
        glow(side * 28, 18, 20, "184,248,255", 0.8);
      }
      ctx.fillStyle = "#b4d9de";
      ctx.font = "7px monospace";
      ctx.textAlign = "center";
      ctx.fillText("CORE / 07", 0, 53);
      ctx.restore();
      // A spreading pressure wave marks a strong pull without covering the world.
      if (envelope > 0 && intensity >= 0.4) {
        const r = unit * (0.1 + progress * (0.9 + intensity * 0.4));
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 0.6, 0, 0, tau);
        ctx.strokeStyle = `rgba(${accent},${(1 - progress) * envelope * intensity * 0.45})`;
        ctx.lineWidth = 1 + intensity * 2;
        ctx.stroke();
      }
      ctx.restore();
      // A gradual vignette frames the viewport without hiding its moving edges.
      const vignette = ctx.createRadialGradient(
        w * 0.63,
        h * 0.42,
        unit * 0.2,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.8,
      );
      vignette.addColorStop(0, "#01060e00");
      vignette.addColorStop(1, "#01060ea8");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
      frameCost = performance.now() - started;
      // Keep a sustained expensive renderer at 30fps instead of dropping input.
      if (!mobile && interval < 25 && (frameCost > 18 || dt > 0.027)) {
        if (++slowFrames > 40) interval = 1000 / 30;
      } else slowFrames = Math.max(0, slowFrames - 1);
    }
    paint.current = () => draw(0);
    function resize() {
      const r = element!.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      w = r.width;
      h = r.height;
      mobile = w <= 760;
      interval = mobile ? 1000 / 30 : 1000 / 60;
      dpr = Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.5);
      element!.width = Math.max(1, Math.round(w * dpr));
      element!.height = Math.max(1, Math.round(h * dpr));
      draw(0);
    }
    function tick(t: number) {
      if (!document.hidden && t - lastPaint >= interval - 1) {
        draw(t);
        lastPaint = t;
      } else if (document.hidden) last = 0;
      frame = requestAnimationFrame(tick);
    }
    const pointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      state.current.x = (e.clientX / w) * 2 - 1;
      state.current.y = (e.clientY / h) * 2 - 1;
    };
    const leave = () => {
      state.current.x = 0;
      state.current.y = 0;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    if (!reduced) {
      window.addEventListener("pointermove", pointer, { passive: true });
      window.addEventListener("blur", leave);
      frame = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", pointer);
      window.removeEventListener("blur", leave);
      paint.current = null;
    };
  }, [reduced]);
  return (
    <canvas
      ref={canvas}
      className="descent-scene"
      aria-hidden="true"
      data-world="full-screen"
    />
  );
}
export default memo(DescentScene);
