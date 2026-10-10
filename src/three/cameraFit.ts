// Pure camera framing math for the wardrobe scene. No three.js, no React:
// everything works on plain numbers so it can be unit tested directly.
// All lengths are in METERS, matching the scene units used by Scene.tsx
// (the scene divides millimeter domain values by 1000 before rendering).

export interface Bounds3 {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface CameraFit {
  /** Camera position in meters. */
  position: [number, number, number];
  /** Orbit target in meters (wardrobe center, not the floor). */
  target: [number, number, number];
  /** Distance from camera to target along the view direction. */
  distance: number;
  minDistance: number;
  maxDistance: number;
}

export interface FitOptions {
  /** Vertical field of view in degrees (must match the R3F camera). */
  fovDeg?: number;
  /** Canvas aspect ratio (width / height). */
  aspect?: number;
  /** Horizontal angle away from straight front (+Z), degrees. */
  azimuthDeg?: number;
  /** Elevation above horizontal, degrees. */
  elevationDeg?: number;
  /** Fraction of the frame kept empty on every side (0..0.4). */
  margin?: number;
}

/** Scene bounds in meters: modules are centered on X, but extend from
 * Z=0 at the back toward +Z. A filler extends only the right-hand side.
 * Include closed doors and handles beyond the carcass front. */
export function wardrobeBounds(
  totalWidth: number,
  fillerWidth: number,
  carcassHeight: number,
  carcassDepth: number,
  plinthHeight: number
): Bounds3 {
  const width = Math.max(0, totalWidth);
  const emptyHalfWidth = width === 0 ? 0.05 : 0;
  return {
    minX: -width / 2 - emptyHalfWidth,
    maxX: width / 2 + Math.max(0, fillerWidth) + emptyHalfWidth,
    minY: 0,
    maxY: carcassHeight + plinthHeight,
    minZ: 0,
    maxZ: carcassDepth + 0.08,
  };
}

const DEG = Math.PI / 180;
/** Never let the fitted box degenerate to a point (empty designs, tiny runs). */
const MIN_HALF_EXTENT_M = 0.5;
const MIN_DISTANCE_M = 1.0;
const MAX_ZOOM_OUT_FACTOR = 3;
const MIN_ZOOM_IN_FACTOR = 0.35;

function normalize(v: [number, number, number]): [number, number, number] {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Fit a perspective camera so all 8 corners of the wardrobe bounding box are
 * comfortably inside the frustum, for BOTH the horizontal and vertical FOV.
 * The exact per-corner condition accounts for corners sitting in front of or
 * behind the center plane, so the projection is conservative without being
 * wasteful. Returns a modest front 3/4 view centered on the wardrobe body.
 */
export function computeCameraFit(
  bounds: Bounds3,
  fovDeg = 38,
  aspect = 1,
  options: FitOptions = {}
): CameraFit {
  const fov = Math.max(5, Math.min(120, fovDeg)) * DEG;
  const aspectSafe = Number.isFinite(aspect) && aspect > 0.05 ? aspect : 1;
  const azimuth = (options.azimuthDeg ?? 24) * DEG;
  const elevation = (options.elevationDeg ?? 14) * DEG;
  const margin = Math.max(0, Math.min(0.4, options.margin ?? 0.12));

  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  const halfX = Math.max((bounds.maxX - bounds.minX) / 2, MIN_HALF_EXTENT_M);
  const halfY = Math.max((bounds.maxY - bounds.minY) / 2, MIN_HALF_EXTENT_M);
  const halfZ = Math.max((bounds.maxZ - bounds.minZ) / 2, MIN_HALF_EXTENT_M);

  // Direction from the wardrobe center TOWARD the camera (front 3/4, +Z side).
  const dir: [number, number, number] = normalize([
    Math.sin(azimuth) * Math.cos(elevation),
    Math.sin(elevation),
    Math.cos(azimuth) * Math.cos(elevation),
  ]);
  // Camera basis: right = normalize(cross(dir, worldUp)), up = cross(right, dir).
  const right: [number, number, number] = normalize([-dir[2], 0, dir[0]]);
  const up: [number, number, number] = [
    right[1] * dir[2] - right[2] * dir[1],
    right[2] * dir[0] - right[0] * dir[2],
    right[0] * dir[1] - right[1] * dir[0],
  ];

  const tanV = Math.tan(fov / 2);
  const tanH = tanV * aspectSafe;
  const slack = 1 - margin;

  let distance = MIN_DISTANCE_M;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const vx = sx * halfX;
        const vy = sy * halfY;
        const vz = sz * halfZ;
        // Forward component: positive means the corner is closer to the camera
        // than the center plane, which shrinks its projection distance.
        const forward = dot([vx, vy, vz], dir);
        const lateral = Math.abs(dot([vx, vy, vz], right));
        const vertical = Math.abs(dot([vx, vy, vz], up));
        if (tanH > 0) distance = Math.max(distance, forward + lateral / (tanH * slack));
        if (tanV > 0) distance = Math.max(distance, forward + vertical / (tanV * slack));
      }
    }
  }

  const position: [number, number, number] = [
    cx + dir[0] * distance,
    cy + dir[1] * distance,
    cz + dir[2] * distance,
  ];

  return {
    position,
    target: [cx, cy, cz],
    distance,
    minDistance: Math.max(0.6, distance * MIN_ZOOM_IN_FACTOR),
    maxDistance: distance * MAX_ZOOM_OUT_FACTOR,
  };
}
