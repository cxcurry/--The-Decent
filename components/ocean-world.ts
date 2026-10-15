import { oceanColor, oceanLayer, terrainEdge, worldY } from "@/lib/ocean";

type World = {
  width: number;
  height: number;
  depth: number;
  origin: number;
  clock: number;
  mobile: boolean;
  lookX: number;
  scatter: number;
  glow: (x: number, y: number, r: number, color: string, alpha: number) => void;
};
const tau = Math.PI * 2;
const noise = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
// Original layered vector scenery. Geometry, plants and landmarks are attached
// to world meters, making vertical travel unambiguous at every score increment.
export function drawOceanWorld(ctx: CanvasRenderingContext2D, world: World) {
  const {
    width: w,
    height: h,
    depth,
    origin,
    clock,
    mobile,
    lookX,
    scatter,
    glow,
  } = world;
  const unit = Math.min(w, h),
    layer = oceanLayer(depth),
    accent = layer.accent;
  const y = (d: number, p = 1) => worldY(d, depth, h, origin, p);
  const [red, green, blue] = oceanColor(depth);
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, `rgb(${red + 5},${green + 12},${blue + 12})`);
  background.addColorStop(0.55, `rgb(${red},${green},${blue})`);
  background.addColorStop(
    1,
    `rgb(${Math.round(red * 0.22)},${Math.round(green * 0.28)},${Math.round(blue * 0.4)})`,
  );
  ctx.fillStyle = background;
  ctx.fillRect(-40, -40, w + 80, h + 80);
  glow(w * 0.74, origin, unit * 0.66, accent, 0.16);
  // The surface visibly recedes above the ship and cannot return at deep scores.
  const surface = y(-155);
  if (surface > -h * 0.5) {
    const light = ctx.createLinearGradient(0, surface - 180, 0, surface + 170);
    light.addColorStop(0, "#b6fff14d");
    light.addColorStop(0.45, "#82f8d636");
    light.addColorStop(1, "#74dcc900");
    ctx.fillStyle = light;
    ctx.fillRect(0, surface - 180, w, 350);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      for (let x = 0; x <= w + 20; x += 20) {
        const wave =
          surface + i * 11 + Math.sin(x * 0.012 + clock * 0.5 + i) * 5;
        if (x === 0) ctx.moveTo(x, wave);
        else ctx.lineTo(x, wave);
      }
      ctx.strokeStyle = `rgba(173,255,232,${0.22 - i * 0.04})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  const sunlight = Math.max(0, 1 - depth / 1900);
  if (sunlight > 0) {
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 8; i++) {
      const x = w * (0.15 + i * 0.15) + Math.sin(clock * 0.14 + i) * 20;
      const beam = ctx.createLinearGradient(x, 0, x - w * 0.22, h);
      beam.addColorStop(0, `rgba(155,255,233,${sunlight * 0.11})`);
      beam.addColorStop(1, "#61b8df00");
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 35, 0);
      ctx.lineTo(x - w * 0.09, h);
      ctx.lineTo(x - w * 0.25, h);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }
  // Three continuous canyon silhouettes, with slower distant layers and broad
  // ledges. Their shape depends on world index, never on animation time.
  for (let distance = 0; distance < 3; distance++) {
    const parallax = 0.42 + distance * 0.29;
    const start =
      Math.floor((depth - (((origin + 200) / h) * 850) / parallax) / 90) - 1;
    const end =
      Math.ceil((depth + (((h - origin + 200) / h) * 850) / parallax) / 90) + 1;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side < 0 ? -50 : w + 50, -80);
      for (let i = start; i <= end; i++) {
        const px =
          terrainEdge(i, side, w, distance) + lookX * (distance + 1) * 3;
        const py = y(i * 90, parallax);
        ctx.lineTo(px, py);
        ctx.lineTo(
          px + (side < 0 ? 1 : -1) * (12 + noise(i + distance) * 32),
          py + 17,
        );
      }
      ctx.lineTo(side < 0 ? -50 : w + 50, h + 80);
      ctx.closePath();
      const stone = ctx.createLinearGradient(0, 0, w, 0);
      stone.addColorStop(
        0,
        `rgb(${4 + distance * 2},${17 + distance * 2},${25 + distance * 3})`,
      );
      stone.addColorStop(
        0.7,
        `rgb(${9 + distance * 3},${32 + distance * 4},${43 + distance * 4})`,
      );
      stone.addColorStop(
        1,
        `rgb(${4 + distance},${17 + distance * 2},${26 + distance * 3})`,
      );
      ctx.fillStyle = stone;
      ctx.fill();
      ctx.strokeStyle = `rgba(${accent},${0.07 + distance * 0.035})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      // Natural rock strata run across each cliff, each at a stable depth.
      for (let i = start; i <= end; i++) {
        const px = terrainEdge(i, side, w, distance),
          py = y(i * 90, parallax);
        ctx.beginPath();
        ctx.moveTo(px, py + 19);
        ctx.lineTo(px + side * (80 + noise(i + 22) * 90), py + 34);
        ctx.lineTo(px + side * 250, py + 40);
        ctx.strokeStyle = `rgba(129,186,190,${0.035 + distance * 0.022})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
  // Sculptural landmarks are anchored to their biome, so they pass above the
  // submarine and remain behind as the next ecosystem comes into view.
  const first = Math.floor((depth - ((origin + 220) / h) * 850) / 210);
  const last = Math.ceil((depth + ((h - origin + 220) / h) * 850) / 210);
  for (let index = first; index <= last; index++) {
    const d = index * 210 + 90;
    if (d < 0 || d > 7080) continue;
    const biome = oceanLayer(d),
      side = index % 2 === 0 ? -1 : 1;
    const x =
      w * (side < 0 ? 0.47 : 0.91) +
      Math.sin(index * 2.3) * w * 0.018 +
      lookX * 7;
    const py = y(d),
      scale = (mobile ? 0.65 : 1) * (0.7 + noise(index + 29) * 0.6);
    ctx.save();
    ctx.translate(x, py);
    ctx.scale(scale, scale);
    const rock = ctx.createLinearGradient(-80, -20, 100, 40);
    rock.addColorStop(0, "#051321");
    rock.addColorStop(0.6, "#214253");
    rock.addColorStop(1, "#0b2430");
    ctx.fillStyle = rock;
    ctx.beginPath();
    ctx.moveTo(-90, 15);
    ctx.bezierCurveTo(-65, -18, -20, -22, 25, -4);
    ctx.lineTo(95, 30);
    ctx.lineTo(55, 70);
    ctx.lineTo(-75, 60);
    ctx.closePath();
    ctx.fill();
    if (biome.kind === "reef") {
      // Branching coral, anemones and waving sea fans.
      for (let branch = 0; branch < 8; branch++) {
        const bx = -60 + branch * 16,
          length = 28 + noise(index * 11 + branch) * 57;
        ctx.strokeStyle = branch % 2 ? "#6ee5bf" : "#f0a58d";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bx, 14);
        ctx.bezierCurveTo(
          bx - 15,
          -length * 0.35,
          bx + 9 + Math.sin(clock * 0.7 + branch) * 4,
          -length * 0.75,
          bx + 7,
          -length,
        );
        ctx.stroke();
        for (let twig = 0; twig < 3; twig++) {
          const by = -length * (0.25 + twig * 0.22);
          ctx.beginPath();
          ctx.moveTo(bx + 2, by);
          ctx.lineTo(bx - 13, by - 14);
          ctx.moveTo(bx + 2, by);
          ctx.lineTo(bx + 17, by - 18);
          ctx.stroke();
        }
      }
      glow(0, -35, 105, "82,222,177", 0.12);
    }
    if (biome.kind === "kelp" || biome.kind === "reef") {
      for (let stalk = 0; stalk < 5; stalk++) {
        const root = -50 + stalk * 22,
          length =
            (biome.kind === "kelp" ? 190 : 80) + noise(index + stalk) * 100;
        ctx.beginPath();
        ctx.moveTo(root, 15);
        for (let j = 1; j <= 20; j++) {
          const p = j / 20,
            sway =
              Math.sin(p * 3 + clock * 0.5 + stalk) * p * (17 + scatter * 0.08);
          ctx.lineTo(root + sway, -p * length);
        }
        ctx.strokeStyle = biome.kind === "reef" ? "#43b7a67d" : "#458b8fb3";
        ctx.lineWidth = 3;
        ctx.stroke();
        for (let leaf = 1; leaf < 7; leaf++) {
          const p = leaf / 8,
            sx = root + Math.sin(p * 3 + clock * 0.5 + stalk) * p * 17,
            sy = -p * length;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(
            sx + (leaf % 2 ? 32 : -32),
            sy - 24,
            sx + (leaf % 2 ? 12 : -12),
            sy - 38,
          );
          ctx.quadraticCurveTo(sx, sy - 22, sx, sy);
          ctx.fillStyle = biome.kind === "reef" ? "#55d5b26b" : "#408f958c";
          ctx.fill();
        }
      }
    }
    if (biome.kind === "ruins") {
      // Broken stone archways, inset doorways and submerged columns.
      ctx.fillStyle = "#1c414b";
      ctx.strokeStyle = "#80c7c04d";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-56, 13);
      ctx.lineTo(-56, -90);
      ctx.bezierCurveTo(-56, -154, 55, -154, 55, -90);
      ctx.lineTo(55, 13);
      ctx.lineTo(32, 13);
      ctx.lineTo(32, -82);
      ctx.bezierCurveTo(32, -123, -32, -123, -32, -82);
      ctx.lineTo(-32, 13);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      for (const pillar of [-1, 1]) {
        const px = pillar * 73,
          ph = pillar > 0 ? 80 : 115;
        ctx.fillStyle = "#244854";
        ctx.fillRect(px - 10, -ph, 20, ph + 12);
        ctx.fillStyle = "#49707a";
        ctx.fillRect(px - 15, -ph, 30, 7);
        ctx.strokeStyle = "#84bfbd38";
        ctx.strokeRect(px - 10, -ph, 20, ph + 12);
      }
      for (let seam = 0; seam < 5; seam++) {
        ctx.beginPath();
        ctx.moveTo(-55, -seam * 21);
        ctx.lineTo(-34, -seam * 21 - 3);
        ctx.moveTo(34, -seam * 21);
        ctx.lineTo(54, -seam * 21 - 2);
        ctx.stroke();
      }
      glow(0, -60, 75, "93,222,211", 0.13);
      ctx.fillStyle = "#92f8dd";
      for (let rune = 0; rune < 4; rune++)
        ctx.fillRect(-8 + rune * 5, -109, 2, 5);
    }
    if (biome.kind === "vents") {
      for (let chimney = 0; chimney < 3; chimney++) {
        const vx = -45 + chimney * 44,
          tall = 55 + noise(index * 8 + chimney) * 85;
        ctx.beginPath();
        ctx.moveTo(vx - 18, 20);
        ctx.lineTo(vx - 11, -tall);
        ctx.lineTo(vx + 8, -tall - 8);
        ctx.lineTo(vx + 24, 20);
        ctx.closePath();
        ctx.fillStyle = "#17212d";
        ctx.fill();
        ctx.strokeStyle = "#9b5e4f70";
        ctx.stroke();
        glow(vx, -tall, 38, "255,140,75", 0.5);
        ctx.fillStyle = "#ffd08f";
        ctx.fillRect(vx - 5, -tall - 2, 13, 3);
        for (let plume = 0; plume < 6; plume++) {
          const p = (((clock * 0.12 + plume / 6 + index * 0.13) % 1) + 1) % 1;
          glow(
            vx + Math.sin(clock * 0.6 + plume) * p * 30,
            -tall - p * 190,
            12 + p * 35,
            "131,157,170",
            (1 - p) * 0.17,
          );
        }
      }
    }
    if (
      biome.kind === "crystals" ||
      biome.kind === "core" ||
      biome.kind === "jellies"
    ) {
      const color = biome.accent;
      for (let crystal = 0; crystal < 6; crystal++) {
        const px = -65 + crystal * 25,
          tall = 20 + noise(index * 9 + crystal) * 105;
        const mineral = ctx.createLinearGradient(px - 12, 0, px + 14, -tall);
        mineral.addColorStop(0, "#142637");
        mineral.addColorStop(0.6, `rgba(${color},.24)`);
        mineral.addColorStop(1, `rgba(${color},.78)`);
        ctx.beginPath();
        ctx.moveTo(px - 12, 15);
        ctx.lineTo(px - 9, -tall * 0.7);
        ctx.lineTo(px + 2, -tall);
        ctx.lineTo(px + 15, -tall * 0.65);
        ctx.lineTo(px + 13, 15);
        ctx.closePath();
        ctx.fillStyle = mineral;
        ctx.fill();
        ctx.strokeStyle = `rgba(${color},.45)`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px + 2, -tall);
        ctx.lineTo(px + 3, 12);
        ctx.stroke();
        glow(px, -tall, 25, color, 0.23);
      }
    }
    ctx.restore();
  }
  // Wildlife also has a world depth: each school is physically left above us.
  const lifeStart = Math.floor((depth - ((origin + 140) / h) * 850) / 145);
  const lifeEnd = Math.ceil((depth + ((h - origin + 180) / h) * 850) / 145);
  for (let index = lifeStart; index <= lifeEnd; index++) {
    const d = index * 145 + 65;
    if (d < 0 || d > 6900) continue;
    const biome = oceanLayer(d),
      baseY = y(d),
      baseX = w * (0.6 + noise(index + 83) * 0.29);
    const away = baseX - w * 0.73 < 0 ? -1 : 1;
    if (biome.kind === "reef" || biome.kind === "kelp") {
      for (let fish = 0; fish < (mobile ? 7 : 13); fish++) {
        const x =
          baseX +
          (fish - 6) * 13 +
          Math.sin(clock * 0.4 + index) * 35 +
          away * scatter;
        const py =
          baseY +
          Math.sin(clock * 0.8 + fish * 0.5) * 8 +
          noise(fish + index) * 28 -
          scatter * 0.2;
        const r = 3 + noise(fish + index) * 4,
          tail = Math.sin(clock * 7 + fish) * 3;
        ctx.fillStyle = biome.kind === "reef" ? "#a4f6c88a" : "#92bce180";
        ctx.beginPath();
        ctx.ellipse(x, py, r * 1.5, r * 0.55, 0, 0, tau);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x - r, py);
        ctx.lineTo(x - r * 2, py - 3 - tail);
        ctx.lineTo(x - r * 2, py + 3 + tail);
        ctx.closePath();
        ctx.fill();
      }
    } else if (biome.kind === "jellies" || biome.kind === "crystals") {
      const x =
          baseX + Math.sin(clock * 0.35 + index) * 14 + away * scatter * 0.6,
        py = baseY + Math.cos(clock * 0.7 + index) * 8 - scatter * 0.3;
      const r = 13 + noise(index) * 13,
        color = biome.accent;
      glow(x, py, r * 3, color, 0.22);
      ctx.save();
      ctx.translate(x, py);
      const pulse = 1 + Math.sin(clock * 1.4 + index) * 0.1;
      ctx.scale(pulse, pulse);
      const bell = ctx.createLinearGradient(0, -r, 0, 10);
      bell.addColorStop(0, `rgba(${color},.7)`);
      bell.addColorStop(1, `rgba(${color},.08)`);
      ctx.fillStyle = bell;
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.7, 0, Math.PI, tau);
      ctx.quadraticCurveTo(0, 9, -r, 0);
      ctx.fill();
      ctx.strokeStyle = `rgba(${color},.55)`;
      ctx.lineWidth = 0.8;
      for (let tentacle = 0; tentacle < 7; tentacle++) {
        const tx = (tentacle / 6 - 0.5) * r * 1.5;
        ctx.beginPath();
        ctx.moveTo(tx, 0);
        ctx.bezierCurveTo(
          tx - 7,
          r,
          tx + Math.sin(clock + tentacle) * r,
          r * 1.4,
          tx + Math.cos(clock * 0.8 + tentacle) * r * 0.5,
          r * 3,
        );
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // Small deep-water lights are sparse, making darkness feel like distance.
      for (let light = 0; light < 4; light++) {
        const x = baseX + light * 18 + away * scatter * 0.5,
          py = baseY + Math.sin(clock + light) * 7;
        glow(x, py, 7, biome.accent, 0.32);
        ctx.fillStyle = `rgba(${biome.accent},.7)`;
        ctx.fillRect(x, py, 1.5, 1.5);
      }
    }
  }
  // Monumental, readable kilometer gates pass upward through the viewport.
  for (
    let band = Math.max(0, Math.floor(depth / 1000) - 1);
    band <= Math.min(7, Math.floor(depth / 1000) + 1);
    band++
  ) {
    const py = y(band * 1000),
      biome = oceanLayer(band * 1000);
    if (py < -80 || py > h + 80) continue;
    const gate = ctx.createLinearGradient(w * 0.42, 0, w * 0.96, 0);
    gate.addColorStop(0, "#a5ffdf00");
    gate.addColorStop(0.6, `rgba(${biome.accent},.18)`);
    gate.addColorStop(1, "#a5ffdf00");
    ctx.fillStyle = gate;
    ctx.fillRect(w * 0.42, py, w * 0.54, 1);
    ctx.fillStyle = `rgba(${biome.accent},.75)`;
    ctx.font = `${mobile ? 8 : 10}px monospace`;
    ctx.textAlign = "left";
    ctx.fillText(
      `${band === 0 ? "SURFACE" : `${band},000 M`} / ${band === 7 ? "JOURNEY'S END" : biome.name.toUpperCase()}`,
      w * 0.48,
      py - 15,
    );
  }
  // An honest ruler: the ticks are world coordinates, not an animation loop.
  ctx.textAlign = "right";
  ctx.font = `${mobile ? 7 : 9}px monospace`;
  const rulerStart = Math.floor((depth - (origin / h) * 850) / 100);
  const rulerEnd = Math.ceil((depth + ((h - origin) / h) * 850) / 100);
  for (let tick = rulerStart; tick <= rulerEnd; tick++) {
    if (tick < 0 || tick > 70) continue;
    const py = y(tick * 100),
      major = tick % 5 === 0;
    ctx.strokeStyle = `rgba(${accent},${major ? 0.42 : 0.18})`;
    ctx.beginPath();
    ctx.moveTo(w - 13, py);
    ctx.lineTo(w - (major ? 31 : 21), py);
    ctx.stroke();
    if (major) {
      ctx.fillStyle = `rgba(${accent},.65)`;
      ctx.fillText(`${(tick * 100).toLocaleString("en-US")} M`, w - 37, py + 3);
    }
  }
  // Final destination: a radiant geological heart, below the last kilometer.
  const coreY = y(7250);
  if (coreY > -220 && coreY < h + 240) {
    const x = w * 0.73,
      r = unit * 0.12;
    glow(x, coreY, r * 3, "255,188,89", 0.45);
    ctx.save();
    ctx.translate(x, coreY);
    for (let ring = 0; ring < 3; ring++) {
      ctx.beginPath();
      ctx.ellipse(
        0,
        0,
        r * (1 + ring * 0.25),
        r * (0.32 + ring * 0.08),
        Math.sin(clock * 0.15 + ring) * 0.18,
        0,
        tau,
      );
      ctx.strokeStyle = `rgba(255,220,139,${0.5 - ring * 0.12})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    const heart = ctx.createRadialGradient(
      -r * 0.2,
      -r * 0.2,
      0,
      0,
      0,
      r * 0.65,
    );
    heart.addColorStop(0, "#fff4c5");
    heart.addColorStop(0.3, "#e6be70");
    heart.addColorStop(1, "#7a4921");
    ctx.fillStyle = heart;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, 0, tau);
    ctx.fill();
    ctx.restore();
  }
}
