import type { Species } from '../domain/species';
import type { FishRuntime } from '../sim/types';
import type { FoodParticle } from '../sim/food';

/** mult=1 keeps the original color; mult=0 flattens it toward mid-gray. */
function desaturateTowardGray(hex: string, mult: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const gray = (r + g + b) / 3;
  const lerp = (c: number) => Math.round(c * mult + gray * (1 - mult));
  return `rgb(${lerp(r)}, ${lerp(g)}, ${lerp(b)})`;
}

export interface FishVisual {
  /** 0-1. Drives color desaturation (visible hunger floor, FR-14). Defaults to 1 (full color). */
  saturationMult: number;
  /** 0-1. Drives tail-wag amplitude (visible happiness floor, FR-14). Defaults to 1 (full liveliness). */
  liveliness: number;
}

export const FULL_VISUAL: FishVisual = { saturationMult: 1, liveliness: 1 };

function bodyPath(ctx: CanvasRenderingContext2D, species: Species): void {
  const len = species.bodyLength;
  const halfLen = len / 2;
  const halfHeight = len * (species.shape === 'long' ? 0.28 : species.shape === 'angular' ? 0.45 : 0.38);

  ctx.beginPath();
  switch (species.shape) {
    case 'round':
      ctx.ellipse(0, 0, halfLen, halfHeight, 0, 0, Math.PI * 2);
      break;
    case 'angular':
      ctx.moveTo(halfLen, 0);
      ctx.lineTo(0, -halfHeight);
      ctx.lineTo(-halfLen, -halfHeight * 0.5);
      ctx.lineTo(-halfLen, halfHeight * 0.5);
      ctx.lineTo(0, halfHeight);
      ctx.closePath();
      break;
    case 'long':
      ctx.ellipse(0, 0, halfLen, halfHeight, 0, 0, Math.PI * 2);
      break;
    case 'tetra':
    default:
      ctx.moveTo(halfLen, 0);
      ctx.quadraticCurveTo(halfLen * 0.3, -halfHeight, -halfLen, 0);
      ctx.quadraticCurveTo(halfLen * 0.3, halfHeight, halfLen, 0);
      ctx.closePath();
      break;
  }
}

export function drawFish(
  ctx: CanvasRenderingContext2D,
  runtime: FishRuntime,
  species: Species,
  visual: FishVisual = FULL_VISUAL,
): void {
  const len = species.bodyLength;
  const bodyColor = desaturateTowardGray(species.bodyColor, visual.saturationMult);
  const accentColor = desaturateTowardGray(species.accentColor, visual.saturationMult);
  const wagAmplitude = 0.5 * visual.liveliness;
  const tailAngle = Math.sin(runtime.tailPhase) * wagAmplitude;

  ctx.save();
  ctx.translate(runtime.x, runtime.y);
  ctx.rotate(runtime.heading);

  // Tail (drawn first, behind the body), pivoting at the body's rear.
  ctx.fillStyle = accentColor;
  ctx.save();
  ctx.translate(-len * 0.45, 0);
  ctx.rotate(tailAngle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-len * 0.5, -len * 0.22);
  ctx.lineTo(-len * 0.5, len * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Body.
  ctx.fillStyle = bodyColor;
  bodyPath(ctx, species);
  ctx.fill();

  // Dorsal accent stripe/fin for a bit of visual character.
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.ellipse(len * 0.05, 0, len * 0.12, len * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye.
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.arc(len * 0.32, -len * 0.05, Math.max(1.5, len * 0.045), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Small flat fleck of sinking food (NFR-3: minimalist, flat shapes). */
export function drawFoodParticle(ctx: CanvasRenderingContext2D, particle: FoodParticle): void {
  ctx.beginPath();
  ctx.fillStyle = '#d9a441';
  ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
  ctx.fill();
}
