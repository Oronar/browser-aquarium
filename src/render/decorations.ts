/**
 * Static tank dressing (NFR-3: flat, stylized shapes) — sand, seaweed, a castle.
 * Purely decorative: positioned as fractions of canvas size so they hold up
 * across resizes, never affects simulation or fish behavior.
 */

const SAND_COLOR = '#c9a464';
const SAND_SHADOW_COLOR = '#a8823f';
const SEAWEED_COLORS = ['#2f8f5b', '#256f47'];
const CASTLE_STONE = '#8a97a8';
const CASTLE_STONE_DARK = '#6b7789';
const CASTLE_ACCENT = '#d9a441';
const CASTLE_DOORWAY = '#132330';

interface SeaweedClump {
  xFrac: number;
  bladeCount: number;
  baseHeight: number;
  phase: number;
}

const SEAWEED_CLUMPS: SeaweedClump[] = [
  { xFrac: 0.3, bladeCount: 4, baseHeight: 70, phase: 0 },
  { xFrac: 0.56, bladeCount: 3, baseHeight: 48, phase: 1.4 },
  { xFrac: 0.83, bladeCount: 5, baseHeight: 88, phase: 2.6 },
  { xFrac: 0.94, bladeCount: 3, baseHeight: 42, phase: 4.0 },
];

const SAND_BAND_MIN_PX = 28;
const SAND_BAND_FRACTION = 0.06;

function sandBaseY(bounds: { width: number; height: number }): number {
  return bounds.height - Math.max(SAND_BAND_MIN_PX, bounds.height * SAND_BAND_FRACTION);
}

/** Gentle static undulation so the sand line reads as a dune, not a ruler-straight edge. */
function sandTopY(x: number, bounds: { width: number; height: number }): number {
  const base = sandBaseY(bounds);
  return (
    base +
    Math.sin((x / bounds.width) * Math.PI * 2.3) * 6 +
    Math.sin((x / bounds.width) * Math.PI * 5.1 + 1) * 3
  );
}

export function drawSand(ctx: CanvasRenderingContext2D, bounds: { width: number; height: number }): void {
  const steps = 24;
  ctx.beginPath();
  ctx.moveTo(0, bounds.height);
  ctx.lineTo(0, sandTopY(0, bounds));
  for (let i = 1; i <= steps; i++) {
    const x = (bounds.width * i) / steps;
    ctx.lineTo(x, sandTopY(x, bounds));
  }
  ctx.lineTo(bounds.width, bounds.height);
  ctx.closePath();
  ctx.fillStyle = SAND_COLOR;
  ctx.fill();

  // A thin shadow band just under the dune line adds depth without extra shapes.
  ctx.beginPath();
  ctx.moveTo(0, sandTopY(0, bounds));
  for (let i = 1; i <= steps; i++) {
    const x = (bounds.width * i) / steps;
    ctx.lineTo(x, sandTopY(x, bounds) + 5);
  }
  ctx.strokeStyle = SAND_SHADOW_COLOR;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawBlade(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  baseY: number,
  height: number,
  sway: number,
  color: string,
): void {
  const width = Math.max(3, height * 0.12);
  ctx.beginPath();
  ctx.moveTo(baseX - width / 2, baseY);
  ctx.quadraticCurveTo(baseX + sway * 0.6, baseY - height * 0.55, baseX + sway, baseY - height);
  ctx.quadraticCurveTo(baseX + sway * 0.6 + width, baseY - height * 0.55, baseX + width / 2, baseY);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/** `nowMs` drives a slow side-to-side sway so the tank doesn't feel static. */
export function drawSeaweed(
  ctx: CanvasRenderingContext2D,
  bounds: { width: number; height: number },
  nowMs: number,
): void {
  for (const clump of SEAWEED_CLUMPS) {
    const baseX = bounds.width * clump.xFrac;
    const baseY = sandTopY(baseX, bounds) + 4;
    for (let b = 0; b < clump.bladeCount; b++) {
      const bladePhase = clump.phase + b * 0.7;
      const height = clump.baseHeight * (0.75 + 0.08 * b);
      const sway = Math.sin(nowMs / 1400 + bladePhase) * (height * 0.18);
      const offsetX = (b - (clump.bladeCount - 1) / 2) * (height * 0.12);
      drawBlade(ctx, baseX + offsetX, baseY, height, sway, SEAWEED_COLORS[b % SEAWEED_COLORS.length]);
    }
  }
}

const CASTLE_X_FRACTION = 0.14;

export function drawCastle(ctx: CanvasRenderingContext2D, bounds: { width: number; height: number }): void {
  const scale = Math.min(1.3, Math.max(0.7, bounds.width / 1400));
  const baseX = bounds.width * CASTLE_X_FRACTION;
  const baseY = sandTopY(baseX, bounds) + 2;

  const keepW = 64 * scale;
  const keepH = 46 * scale;
  const towerW = 22 * scale;
  const towerH = 60 * scale;

  ctx.save();
  ctx.translate(baseX, baseY);

  for (const side of [-1, 1]) {
    const tx = side * (keepW / 2 + towerW / 2 - 4 * scale);
    ctx.fillStyle = CASTLE_STONE;
    ctx.fillRect(tx - towerW / 2, -towerH, towerW, towerH);
    ctx.beginPath();
    ctx.moveTo(tx - towerW / 2 - 4 * scale, -towerH);
    ctx.lineTo(tx, -towerH - 22 * scale);
    ctx.lineTo(tx + towerW / 2 + 4 * scale, -towerH);
    ctx.closePath();
    ctx.fillStyle = CASTLE_ACCENT;
    ctx.fill();
  }

  ctx.fillStyle = CASTLE_STONE_DARK;
  ctx.fillRect(-keepW / 2, -keepH, keepW, keepH);

  const crenCount = 5;
  const crenW = keepW / (crenCount * 2);
  for (let i = 0; i < crenCount; i++) {
    const cx = -keepW / 2 + crenW * (2 * i + 0.5);
    ctx.fillRect(cx, -keepH - 8 * scale, crenW, 8 * scale);
  }

  const doorW = 14 * scale;
  const doorH = 20 * scale;
  ctx.beginPath();
  ctx.moveTo(-doorW / 2, 0);
  ctx.lineTo(-doorW / 2, -doorH + doorW / 2);
  ctx.arc(0, -doorH + doorW / 2, doorW / 2, Math.PI, 0);
  ctx.lineTo(doorW / 2, 0);
  ctx.closePath();
  ctx.fillStyle = CASTLE_DOORWAY;
  ctx.fill();

  ctx.restore();
}

export function drawDecorations(
  ctx: CanvasRenderingContext2D,
  bounds: { width: number; height: number },
  nowMs: number,
): void {
  drawSand(ctx, bounds);
  drawCastle(ctx, bounds);
  drawSeaweed(ctx, bounds, nowMs);
}
