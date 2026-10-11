import * as THREE from 'three';

export type SurfaceFinish = {
  baseColor: string | null;
  normal: string | null;
  roughness: string | null;
  tileMeters: number;
  verticalGrain: boolean;
  color: string;
  roughnessValue: number;
  metalness: number;
  glass?: boolean;
};

const TEXTURE_ROOT = '/assets/materials';
const ASSET_SET: Record<string, Omit<SurfaceFinish, 'color' | 'roughnessValue' | 'metalness'>> = {
  'DEMO-wood-oak': { baseColor: `${TEXTURE_ROOT}/oak/basecolor-1k.webp`, normal: `${TEXTURE_ROOT}/oak/normal-1k.webp`, roughness: `${TEXTURE_ROOT}/oak/roughness-1k.webp`, tileMeters: 1.83, verticalGrain: true },
  'DEMO-wood-walnut': { baseColor: `${TEXTURE_ROOT}/walnut/basecolor-1k.webp`, normal: `${TEXTURE_ROOT}/walnut/normal-1k.webp`, roughness: `${TEXTURE_ROOT}/walnut/roughness-1k.webp`, tileMeters: 0.7, verticalGrain: true },
  'DEMO-wood-smoked': { baseColor: `${TEXTURE_ROOT}/smoked-oak/basecolor.webp`, normal: `${TEXTURE_ROOT}/smoked-oak/normal.webp`, roughness: `${TEXTURE_ROOT}/smoked-oak/roughness.webp`, tileMeters: 1.83, verticalGrain: true },
};

export function surfaceFinish(code: string): SurfaceFinish {
  const asset = ASSET_SET[code];
  if (asset) return { ...asset, color: '#ffffff', roughnessValue: 0.82, metalness: 0.02 };
  if (code === 'DEMO-lacquer-graphite') return { baseColor: null, normal: null, roughness: null, tileMeters: 1, verticalGrain: false, color: '#43464a', roughnessValue: 0.48, metalness: 0.03 };
  if (code === 'DEMO-glass-smoked') return { baseColor: null, normal: null, roughness: null, tileMeters: 1, verticalGrain: false, color: '#55534e', roughnessValue: 0.19, metalness: 0.02, glass: true };
  return { baseColor: null, normal: null, roughness: null, tileMeters: 1, verticalGrain: false, color: '#eeeae2', roughnessValue: 0.54, metalness: 0.01 };
}

/** Return physically scaled panel UVs. Wood grain remains vertical on broad faces.
 * Walnut's captured U-axis is horizontal, so it is rotated into the panel's height axis. */
export function physicalPanelUv(
  x: number, y: number, z: number,
  normalX: number, normalY: number, normalZ: number,
  size: [number, number, number], tileMeters: number, walnut = false,
): [number, number] {
  const [sx, sy, sz] = size;
  const ax = Math.abs(normalX), ay = Math.abs(normalY), az = Math.abs(normalZ);
  if (ay >= ax && ay >= az) return [ (x + sx / 2) / tileMeters, (z + sz / 2) / tileMeters ];
  if (ax >= az) {
    const u = walnut ? (y + sy / 2) / tileMeters : (z + sz / 2) / tileMeters;
    const v = walnut ? (z + sz / 2) / tileMeters : (y + sy / 2) / tileMeters;
    return [u, v];
  }
  const u = walnut ? (y + sy / 2) / tileMeters : (x + sx / 2) / tileMeters;
  const v = walnut ? (x + sx / 2) / tileMeters : (y + sy / 2) / tileMeters;
  return [u, v];
}

/** Write metre-based UVs into any box-like geometry. UVs repeat at the texture's
 * measured physical tile size, giving each board/panel a sensible local scale. */
export function applyPhysicalPanelUvs(
  geometry: THREE.BufferGeometry,
  size: [number, number, number],
  tileMeters: number,
  walnut = false,
): THREE.BufferGeometry {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  if (!position || !normal || !uv) return geometry;
  for (let i = 0; i < position.count; i++) {
    const [u, v] = physicalPanelUv(
      position.getX(i), position.getY(i), position.getZ(i),
      normal.getX(i), normal.getY(i), normal.getZ(i), size, tileMeters, walnut,
    );
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
  return geometry;
}

/** Plane UVs in physical metres, for room wall/floor maps. */
export function applyPhysicalPlaneUvs(geometry: THREE.BufferGeometry, widthMeters: number, heightMeters: number, tileMeters: number): THREE.BufferGeometry {
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  if (!position || !uv) return geometry;
  for (let i = 0; i < position.count; i++) uv.setXY(i, (position.getX(i) + widthMeters / 2) / tileMeters, (position.getY(i) + heightMeters / 2) / tileMeters);
  uv.needsUpdate = true;
  return geometry;
}

/** Door pull position measured from the hinge/panel origin, always on the free edge. */
export function doorHandleLocalX(kind: 'hinged' | 'sliding', hingeSide: 'left' | 'right', panelWidth: number): number {
  if (kind === 'hinged') return hingeSide === 'left' ? panelWidth - 0.065 : -panelWidth + 0.065;
  return hingeSide === 'left' ? panelWidth / 2 - 0.065 : -panelWidth / 2 + 0.065;
}

export interface RoomBounds {
  width: number;
  depth: number;
  wallHeight: number;
}

/** Scaled for framing only. These bounds are deliberately not used for camera fitting. */
export function roomDimensions(wardrobeWidthMeters: number): RoomBounds {
  return { width: Math.max(4.2, wardrobeWidthMeters + 2.2), depth: 5.4, wallHeight: 3.05 };
}

export interface DoorPose {
  x: number;
  angle: number;
}

export function doorPose(kind: 'hinged' | 'sliding', hingeSide: 'left' | 'right', closedX: number, width: number, progress: number): DoorPose {
  const t = THREE.MathUtils.clamp(progress, 0, 1);
  if (kind === 'sliding') return { x: closedX + (hingeSide === 'left' ? 1 : -1) * width * 0.42 * t, angle: 0 };
  return { x: closedX, angle: -t * (hingeSide === 'left' ? 1 : -1) * Math.PI * 0.44 };
}
