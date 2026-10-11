// Original, local-asset room and parametric wardrobe renderer. Product mesh
// coordinates come from the existing deterministic layout helpers.
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useAppStore } from '../state/store';
import { computeLayout } from '../domain/layout';
import { CARCASS_DEPTH_MM } from '../domain/catalog';
import { carcassColor, carcassGeometry, doorGeometry, fittingGeometry, plinthSpec, mm } from './geometry';
import type { BoxSpec, DoorSpec } from './geometry';
import { PLINTH_HEIGHT_MM } from '../domain/layout';
import { computeCameraFit, wardrobeBounds } from './cameraFit';
import type { Bounds3 } from './cameraFit';
import { applyPhysicalPanelUvs, applyPhysicalPlaneUvs, doorHandleLocalX, doorPose, roomDimensions, surfaceFinish } from './materials';
import { usePresentationStore } from '../state/presentation';

const FOV_DEG = 38;
const FIT_MARGIN = 0.12;
const ROOM_HDR = '/assets/room/lythwood-room_1k.hdr';

interface LoadedMaps { map?: THREE.Texture; normalMap?: THREE.Texture; roughnessMap?: THREE.Texture }
type TextureWaiter = (texture: THREE.Texture | null) => void;
interface TextureEntry { texture: THREE.Texture; refs: number; loaded: boolean; waiters: TextureWaiter[] }
const texturePool = new Map<string, TextureEntry>();
const textureLoader = new THREE.TextureLoader();

function acquireTexture(url: string, renderer: THREE.WebGLRenderer): { promise: Promise<THREE.Texture | null>; release: () => void } {
  let entry = texturePool.get(url);
  if (!entry) {
    const placeholder = new THREE.Texture();
    entry = { texture: placeholder, refs: 0, loaded: false, waiters: [] };
    texturePool.set(url, entry);
    const current = entry;
    textureLoader.load(url, (loaded) => {
      loaded.wrapS = loaded.wrapT = THREE.RepeatWrapping;
      loaded.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      loaded.colorSpace = url.includes('basecolor') ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      loaded.needsUpdate = true;
      current.texture.dispose();
      current.texture = loaded;
      current.loaded = true;
      current.waiters.splice(0).forEach((resolve) => resolve(loaded));
      if (current.refs === 0) {
        loaded.dispose();
        texturePool.delete(url);
      }
    }, undefined, () => {
      current.texture.dispose();
      current.waiters.splice(0).forEach((resolve) => resolve(null));
      if (texturePool.get(url) === current) texturePool.delete(url);
    });
  }
  entry.refs += 1;
  const current = entry;
  const promise = current.loaded
    ? Promise.resolve(current.texture)
    : new Promise<THREE.Texture | null>((resolve) => current.waiters.push(resolve));
  let released = false;
  return {
    promise,
    release: () => {
      if (released) return;
      released = true;
      current.refs = Math.max(0, current.refs - 1);
      if (current.refs === 0 && current.loaded) {
        // Deferred cleanup allows StrictMode's development remount to reuse the same maps.
        window.setTimeout(() => {
          if (current.refs === 0 && current.loaded && texturePool.get(url) === current) {
            current.texture.dispose();
            texturePool.delete(url);
          }
        }, 0);
      }
    },
  };
}

function useTextureMaps(urls: { map: string | null; normalMap: string | null; roughnessMap: string | null }): LoadedMaps {
  const gl = useThree((s) => s.gl);
  const [maps, setMaps] = useState<LoadedMaps>({});
  const key = `${urls.map ?? ''}|${urls.normalMap ?? ''}|${urls.roughnessMap ?? ''}`;
  useEffect(() => {
    let active = true;
    const entries = [urls.map, urls.normalMap, urls.roughnessMap].filter((v): v is string => !!v);
    const leases = entries.map((url) => acquireTexture(url, gl));
    Promise.all(leases.map((lease) => lease.promise)).then((loaded) => {
      if (!active) return;
      const byUrl = new Map(entries.map((url, i) => [url, loaded[i]]));
      setMaps({
        map: urls.map ? byUrl.get(urls.map) ?? undefined : undefined,
        normalMap: urls.normalMap ? byUrl.get(urls.normalMap) ?? undefined : undefined,
        roughnessMap: urls.roughnessMap ? byUrl.get(urls.roughnessMap) ?? undefined : undefined,
      });
    });
    return () => {
      active = false;
      leases.forEach((lease) => lease.release());
    };
    // The serialized texture URLs are the stable material identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, gl]);
  return maps;
}

function RoundedPanel({ spec, finishCode, selected = false }: { spec: BoxSpec; finishCode: string; selected?: boolean }) {
  const code = spec.finishCode ?? finishCode;
  const finish = surfaceFinish(code);
  const maps = useTextureMaps({ map: spec.surface === 'metal' || spec.surface === 'plain' ? null : finish.baseColor, normalMap: spec.surface === 'metal' || spec.surface === 'plain' ? null : finish.normal, roughnessMap: spec.surface === 'metal' || spec.surface === 'plain' ? null : finish.roughness });
  const geometry = useMemo(() => {
    const radius = Math.min(...spec.size) * 0.11;
    const g = new RoundedBoxGeometry(spec.size[0], spec.size[1], spec.size[2], 2, Math.max(0.0005, radius));
    if (spec.surface !== 'metal' && spec.surface !== 'plain') applyPhysicalPanelUvs(g, spec.size, finish.tileMeters, code === 'DEMO-wood-walnut');
    return g;
  }, [spec.size[0], spec.size[1], spec.size[2], spec.surface, finish.tileMeters, code]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const metal = spec.surface === 'metal';
  const plain = spec.surface === 'plain';
  const baseColor = metal ? spec.color : plain ? spec.color : finish.color;
  return (
    <mesh position={spec.pos} geometry={geometry} castShadow={!metal} receiveShadow>
      {finish.glass && !metal && !plain ? (
        <meshPhysicalMaterial color={finish.color} roughness={finish.roughnessValue} metalness={finish.metalness} transmission={0.4} thickness={0.018} ior={1.48} transparent opacity={0.88} />
      ) : (
        <meshStandardMaterial
          color={baseColor}
          map={maps.map}
          normalMap={maps.normalMap}
          roughnessMap={maps.roughnessMap}
          normalScale={new THREE.Vector2(0.24, 0.24)}
          roughness={metal ? 0.26 : finish.roughnessValue}
          metalness={metal ? 0.72 : finish.metalness}
          emissive={selected ? '#8c683a' : '#000000'}
          emissiveIntensity={selected ? 0.1 : 0}
        />
      )}
    </mesh>
  );
}

function RoundedPlate({ size, pos, color = '#c5c1b8', metal = false }: { size: [number, number, number]; pos: [number, number, number]; color?: string; metal?: boolean }) {
  const spec: BoxSpec = { size, pos, color, surface: metal ? 'metal' : 'plain' };
  return <RoundedPanel spec={spec} finishCode="DEMO-lacquer-white" />;
}

function CylinderLink({ a, b, radius, color, metal = false }: { a: [number, number, number]; b: [number, number, number]; radius: number; color: string; metal?: boolean }) {
  const dir = useMemo(() => new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), [a[0], a[1], a[2], b[0], b[1], b[2]]);
  const quaternion = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()), [dir]);
  const geometry = useMemo(() => new THREE.CylinderGeometry(radius, radius, dir.length(), 8, 1), [radius, dir]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} quaternion={quaternion} geometry={geometry} castShadow><meshStandardMaterial color={color} roughness={metal ? 0.28 : 0.72} metalness={metal ? 0.68 : 0.02} /></mesh>;
}

function Hangers({ width, railY, z, count = 3 }: { width: number; railY: number; z: number; count?: number }) {
  const hangerWidth = Math.min(0.39, width * 0.68);
  const hangers = Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * 0.035);
  return <group>
    {hangers.map((zShift, index) => {
      const depth = z + zShift;
      const left: [number, number, number] = [-hangerWidth / 2, railY - 0.055, depth];
      const right: [number, number, number] = [hangerWidth / 2, railY - 0.055, depth];
      const apex: [number, number, number] = [0, railY - 0.006, depth];
      const bottom: [number, number, number] = [0, railY - 0.23, depth];
      return <group key={index}>
        <CylinderLink a={apex} b={left} radius={0.004} color="#b38b59" />
        <CylinderLink a={apex} b={right} radius={0.004} color="#b38b59" />
        <CylinderLink a={left} b={bottom} radius={0.0035} color="#b38b59" />
        <CylinderLink a={bottom} b={right} radius={0.0035} color="#b38b59" />
        <CylinderLink a={apex} b={[0, railY + 0.022, depth]} radius={0.0025} color="#9aa0a4" metal />
        <CylinderLink a={[0, railY + 0.022, depth]} b={[0.018, railY + 0.032, depth]} radius={0.0025} color="#9aa0a4" metal />
      </group>;
    })}
  </group>;
}

function Door({ spec }: { spec: DoorSpec }) {
  const root = useRef<THREE.Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  const isOpen = useAppStore((state) => state.doorsOpen);
  useEffect(() => invalidate(), [isOpen, invalidate]);
  const progress = useRef(0);
  const closedX = spec.kind === 'hinged'
    ? spec.pos[0] - (spec.hingeSide === 'left' ? spec.size[0] / 2 : -spec.size[0] / 2)
    : spec.pos[0];
  const pivotShift: [number, number, number] = spec.kind === 'hinged' ? [spec.hingeSide === 'left' ? spec.size[0] / 2 : -spec.size[0] / 2, 0, 0] : [0, 0, 0];
  useFrame((_, delta) => {
    if (!root.current) return;
    const goal = useAppStore.getState().doorsOpen ? 1 : 0;
    progress.current = THREE.MathUtils.damp(progress.current, goal, 5.5, Math.min(delta, 0.1));
    const pose = doorPose(spec.kind, spec.hingeSide, closedX, spec.size[0], progress.current);
    root.current.position.x = pose.x;
    root.current.rotation.y = spec.kind === 'hinged' ? pose.angle : 0;
    if (Math.abs(progress.current - goal) > 0.001) invalidate();
  });
  const frontEdgeX = doorHandleLocalX(spec.kind, spec.hingeSide, spec.size[0]);
  const frontZ = spec.size[2] / 2;
  return (
    <group ref={root} position={[closedX, spec.pos[1], spec.pos[2]]}>
      <RoundedPanel spec={{ pos: pivotShift, size: spec.size, color: spec.color, surface: 'finish', finishCode: spec.finishCode }} finishCode={spec.finishCode} />
      <mesh position={[frontEdgeX, 0, frontZ + 0.014]} castShadow>
        <cylinderGeometry args={[0.008, 0.008, 0.26, 16]} />
        <meshStandardMaterial color="#8d9295" roughness={0.24} metalness={0.82} />
      </mesh>
      {[-0.082, 0.082].map((y) => <mesh key={y} position={[frontEdgeX, y, frontZ + 0.007]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.0055, 0.0055, 0.025, 10]} />
        <meshStandardMaterial color="#8d9295" roughness={0.26} metalness={0.78} />
      </mesh>)}
      {spec.kind === 'hinged' && [-0.36, 0, 0.36].map((fraction) => <group key={fraction} position={[spec.hingeSide === 'left' ? 0.006 : -0.006, fraction * spec.size[1], frontZ + 0.002]}>
        <mesh castShadow><cylinderGeometry args={[0.008, 0.008, 0.065, 10]} /><meshStandardMaterial color="#a6a7a5" metalness={0.72} roughness={0.31} /></mesh>
        <RoundedPlate size={[0.027, 0.07, 0.006]} pos={[spec.hingeSide === 'left' ? 0.014 : -0.014, 0, -0.002]} color="#b7b4ac" metal />
      </group>)}
    </group>
  );
}

function WardrobeRail({ width, y, z }: { width: number; y: number; z: number }) {
  return <group>
    <mesh position={[0, y, z]} rotation={[0, 0, -Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.015, 0.015, Math.max(0.1, width - 0.018), 24, 1]} />
      <meshStandardMaterial color="#969a9b" metalness={0.78} roughness={0.26} />
    </mesh>
    {[-1, 1].map((side) => <group key={side} position={[side * (width / 2 - 0.012), y, z]}>
      <mesh castShadow><cylinderGeometry args={[0.018, 0.018, 0.016, 16]} /><meshStandardMaterial color="#a5a6a2" metalness={0.68} roughness={0.31} /></mesh>
      <RoundedPlate size={[0.026, 0.034, 0.042]} pos={[-side * 0.008, -0.01, 0]} color="#aaa9a2" metal />
    </group>)}
  </group>;
}

function WardrobeModule({ mod, design, showStyling, showLighting }: { mod: ReturnType<typeof computeLayout>['modules'][number]; design: import('../domain/types').Design; showStyling: boolean; showLighting: boolean }) {
  const selectedModuleId = useAppStore((s) => s.selectedModuleId);
  const select = useAppStore((s) => s.select);
  const doorsOpen = useAppStore((s) => s.doorsOpen);
  const selected = mod.spec.id === selectedModuleId;
  const carcass = useMemo(() => carcassGeometry(mod, design), [mod, design]);
  const fittings = useMemo(() => fittingGeometry(mod, design), [mod, design]);
  const doors = useMemo(() => doorGeometry(mod, design, 1), [mod, design]);
  const rail = mod.elements.find((e) => e.kind === 'rail');
  const railY = rail ? (18 + rail.y + 15) / 1000 : 1.35;
  const railZ = (CARCASS_DEPTH_MM / 2 - 80 + 30) / 1000;
  return (
    <group position={[mod.x / 1000, PLINTH_HEIGHT_MM / 1000, 0]} onClick={(e) => { e.stopPropagation(); select(mod.spec.id === selectedModuleId ? null : mod.spec.id); }}>
      {carcass.map((box, i) => <RoundedPanel key={`c-${i}`} spec={box} finishCode={design.carcassFinishCode} selected={selected} />)}
      {fittings.map((box, i) => <RoundedPanel key={`f-${i}`} spec={box} finishCode={design.carcassFinishCode} />)}
      {rail && <group position={[mod.width / 2000, 0, 0]}><WardrobeRail width={mod.interiorWidth / 1000} y={railY} z={railZ} /></group>}
      {showStyling && rail && (mod.spec.doorType === 'none' || doorsOpen) && <group position={[mod.width / 2000, 0, 0]}><Hangers width={mod.interiorWidth / 1000} railY={railY} z={railZ} count={mod.width >= 750 ? 3 : 2} /></group>}
      {showLighting && (mod.spec.doorType === 'none' || doorsOpen) && <group>
        <mesh position={[0.026, design.wardrobeHeightMm / 2000, (CARCASS_DEPTH_MM - 72) / 1000]}>
          <boxGeometry args={[0.008, Math.max(0.3, (design.wardrobeHeightMm - 300) / 1000), 0.012]} />
          <meshStandardMaterial color="#ffefcf" emissive="#ffd89a" emissiveIntensity={0.4} roughness={0.35} />
        </mesh>
        <pointLight position={[0.06, design.wardrobeHeightMm / 2000, (CARCASS_DEPTH_MM - 110) / 1000]} color="#ffe8c0" intensity={0.12} distance={1.5} decay={2} />
      </group>}
      {doors.map((door, i) => <Door key={`d-${i}`} spec={door} />)}
    </group>
  );
}

function Wardrobe({ design, showStyling, showLighting }: { design: import('../domain/types').Design; showStyling: boolean; showLighting: boolean }) {
  const layout = useMemo(() => computeLayout(design), [design]);
  const center = layout.totalModuleWidth / 2;
  const carcassColorHex = carcassColor(design.carcassFinishCode);
  const plinth = plinthSpec(layout.totalModuleWidth);
  return <group position={[-center / 1000, 0, 0]}>
    {layout.totalModuleWidth > 0 && <RoundedPanel spec={{ ...plinth, surface: 'plain' }} finishCode={design.carcassFinishCode} />}
    {layout.modules.map((mod) => <WardrobeModule key={mod.spec.id} mod={mod} design={design} showStyling={showStyling} showLighting={showLighting} />)}
    {layout.filler && <RoundedPanel spec={{ pos: [mm(layout.filler.x + layout.filler.width / 2), mm((design.wardrobeHeightMm + PLINTH_HEIGHT_MM) / 2), mm(CARCASS_DEPTH_MM / 2)], size: [mm(layout.filler.width), mm(design.wardrobeHeightMm), mm(20)], color: carcassColorHex, finishCode: design.carcassFinishCode }} finishCode={design.carcassFinishCode} />}
  </group>;
}

function TexturePlane({ position, size, rotation, color, mapUrl, normalUrl, roughnessUrl, tileMeters, roughness = 0.85 }: { position: [number, number, number]; size: [number, number]; rotation: [number, number, number]; color: string; mapUrl: string | null; normalUrl: string | null; roughnessUrl: string | null; tileMeters: number; roughness?: number }) {
  const maps = useTextureMaps({ map: mapUrl, normalMap: normalUrl, roughnessMap: roughnessUrl });
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(size[0], size[1]);
    applyPhysicalPlaneUvs(g, size[0], size[1], tileMeters);
    return g;
  }, [size[0], size[1], tileMeters]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh position={position} rotation={rotation} geometry={geometry} receiveShadow>
    <meshStandardMaterial color={color} map={maps.map} normalMap={maps.normalMap} roughnessMap={maps.roughnessMap} normalScale={new THREE.Vector2(0.11, 0.11)} roughness={roughness} metalness={0} side={THREE.DoubleSide} />
  </mesh>;
}

function Room({ wardrobeWidth, wallColor, floorFinish }: { wardrobeWidth: number; wallColor: string; floorFinish: 'oak' | 'herringbone' | 'stone' }) {
  const dims = roomDimensions(wardrobeWidth);
  const half = dims.width / 2;
  const roomDepth = dims.depth;
  const roomFloorZ = roomDepth / 2 - 0.06;
  const floorData = floorFinish === 'herringbone'
    ? { mapUrl: '/assets/materials/floor/basecolor-1k.webp', normalUrl: '/assets/materials/floor/normal-1k.webp', roughnessUrl: '/assets/materials/floor/roughness-1k.webp', tile: 3.4, color: '#ffffff' }
    : floorFinish === 'oak'
      ? { mapUrl: '/assets/materials/oak/basecolor-1k.webp', normalUrl: '/assets/materials/oak/normal-1k.webp', roughnessUrl: '/assets/materials/oak/roughness-1k.webp', tile: 1.83, color: '#ffffff' }
      : { mapUrl: null, normalUrl: '/assets/materials/plaster/normal-1k.webp', roughnessUrl: '/assets/materials/plaster/roughness-1k.webp', tile: 0.65, color: '#d7d4ce' };
  return <group>
    <TexturePlane position={[0, dims.wallHeight / 2, -0.05]} size={[dims.width, dims.wallHeight]} rotation={[0, 0, 0]} color={wallColor} mapUrl={null} normalUrl="/assets/materials/plaster/normal-1k.webp" roughnessUrl="/assets/materials/plaster/roughness-1k.webp" tileMeters={1} roughness={0.92} />
    <TexturePlane position={[0, -0.002, roomFloorZ]} size={[dims.width + 0.35, roomDepth]} rotation={[-Math.PI / 2, 0, 0]} color={floorData.color} mapUrl={floorData.mapUrl} normalUrl={floorData.normalUrl} roughnessUrl={floorData.roughnessUrl} tileMeters={floorData.tile} roughness={0.74} />
    {/* Short side return and skirting establish a room corner without enclosing the orbit view. */}
    <TexturePlane position={[-half, dims.wallHeight / 2, -0.66]} size={[1.25, dims.wallHeight]} rotation={[0, Math.PI / 2, 0]} color={wallColor} mapUrl={null} normalUrl="/assets/materials/plaster/normal-1k.webp" roughnessUrl="/assets/materials/plaster/roughness-1k.webp" tileMeters={1} roughness={0.92} />
    <RoundedPlate size={[dims.width, 0.075, 0.045]} pos={[0, 0.042, 0.014]} color="#f8f6f1" />
    <RoundedPlate size={[0.035, 0.075, 1.25]} pos={[-half + 0.018, 0.042, -0.66]} color="#f8f6f1" />
    {floorFinish === 'oak' && <OakBoardSeams width={dims.width + 0.35} depth={roomDepth} centerZ={roomFloorZ} />}
    {floorFinish === 'stone' && <StoneSeams width={dims.width + 0.35} depth={roomDepth} centerZ={roomFloorZ} />}
  </group>;
}

function OakBoardSeams({ width, depth, centerZ }: { width: number; depth: number; centerZ: number }) {
  const geometry = useMemo(() => {
    const points: number[] = [];
    const left = -width / 2, right = width / 2;
    const back = centerZ - depth / 2, front = centerZ + depth / 2;
    const boardWidth = 0.18;
    // Integer-indexed stepping: float accumulation with Math.floor on a possibly
    // non-integer left edge could emit NaN vertices and break the whole draw call.
    const firstCol = Math.ceil(left / boardWidth);
    const lastCol = Math.floor(right / boardWidth);
    for (let col = firstCol; col <= lastCol; col++) {
      const x = Math.max(left, col * boardWidth);
      points.push(x, -0.0015, back, x, -0.0015, front);
      const offset = (col - firstCol) % 2 === 0 ? 0.0 : 0.52;
      for (let row = 0; row < 5; row++) {
        const z = back + 1.15 * row + offset;
        if (z <= back || z >= front) continue;
        points.push(x, -0.0015, z, Math.min(x + boardWidth, right), -0.0015, z);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return g;
  }, [width, depth, centerZ]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <lineSegments geometry={geometry}><lineBasicMaterial color="#4f402e" transparent opacity={0.17} /></lineSegments>;
}

function StoneSeams({ width, depth, centerZ }: { width: number; depth: number; centerZ: number }) {
  const lines = useMemo(() => {
    const out: Array<[[number, number, number], [number, number, number]]> = [];
    const left = -width / 2, right = width / 2;
    const back = centerZ - depth / 2, front = centerZ + depth / 2;
    for (let x = Math.ceil(left / 0.65) * 0.65; x <= right; x += 0.65) out.push([[x, -0.0015, back], [x, -0.0015, front]]);
    for (let z = Math.ceil(back / 0.65) * 0.65; z <= front; z += 0.65) out.push([[left, -0.0015, z], [right, -0.0015, z]]);
    return out;
  }, [width, depth, centerZ]);
  return <group>{lines.map((points, i) => <Line key={i} points={points} color="#a9a69f" lineWidth={0.7} transparent opacity={0.34} />)}</group>;
}

function EnvironmentLighting({ enabled }: { enabled: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    if (!enabled) { scene.environment = null; return; }
    let alive = true;
    let envTexture: THREE.DataTexture | null = null;
    const loader = new RGBELoader();
    loader.load(ROOM_HDR, (texture) => {
      if (!alive) { texture.dispose(); return; }
      texture.mapping = THREE.EquirectangularReflectionMapping;
      envTexture = texture;
      scene.environment = texture;
      scene.environmentIntensity = 0.4;
      invalidate();
    }, undefined, () => { /* local HDR is optional; direct lights remain active */ });
    return () => { alive = false; if (scene.environment === envTexture) scene.environment = null; envTexture?.dispose(); };
  }, [enabled, scene, invalidate]);
  return null;
}

/** Native scene labels avoid DOM portals and are included in PNG exports. */
function DimensionLabel({ text, position }: { text: string; position: [number, number, number] }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 144;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = 'rgba(255,255,255,0.97)';
      context.fillRect(2, 2, 508, 140);
      context.strokeStyle = '#b9b1a2'; context.lineWidth = 4;
      context.strokeRect(2, 2, 508, 140);
      context.fillStyle = '#4f493f'; context.font = '600 64px Arial, sans-serif';
      context.textAlign = 'center'; context.textBaseline = 'middle';
      context.fillText(text, 256, 76);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite position={position} scale={[0.3, 0.084, 1]} renderOrder={100}>
    <spriteMaterial map={texture} transparent depthTest={false} depthWrite={false} toneMapped={false} />
  </sprite>;
}

function Measurements({ width, height, depth }: { width: number; height: number; depth: number }) {
  const totalH = height + PLINTH_HEIGHT_MM;
  const z = (CARCASS_DEPTH_MM + 115) / 1000;
  const left = -width / 2000;
  const right = width / 2000;
  const fmt = (mmValue: number) => `${(mmValue / 10).toFixed(1)} cm`;
  return <group>
    <Line points={[[left, totalH / 1000 + 0.055, z], [right, totalH / 1000 + 0.055, z]]} color="#726b5f" lineWidth={1} />
    <Line points={[[left, totalH / 1000 + 0.01, z], [left, totalH / 1000 + 0.10, z]]} color="#726b5f" lineWidth={1} />
    <Line points={[[right, totalH / 1000 + 0.01, z], [right, totalH / 1000 + 0.10, z]]} color="#726b5f" lineWidth={1} />
    <DimensionLabel key="width" position={[0, totalH / 1000 + 0.065, z]} text={fmt(width)} />
    <Line points={[[left - 0.12, 0.02, z], [left - 0.12, totalH / 1000, z]]} color="#726b5f" lineWidth={1} />
    <Line points={[[left - 0.17, 0.02, z], [left - 0.07, 0.02, z]]} color="#726b5f" lineWidth={1} />
    <Line points={[[left - 0.17, totalH / 1000, z], [left - 0.07, totalH / 1000, z]]} color="#726b5f" lineWidth={1} />
    <DimensionLabel key="height" position={[left - 0.12, totalH / 2000, z]} text={fmt(totalH)} />
    <Line points={[[right + 0.14, 0.52, 0], [right + 0.14, 0.52, depth / 1000]]} color="#726b5f" lineWidth={1} />
    <Line points={[[right + 0.09, 0.52, 0], [right + 0.19, 0.52, 0]]} color="#726b5f" lineWidth={1} />
    <Line points={[[right + 0.09, 0.52, depth / 1000], [right + 0.19, 0.52, depth / 1000]]} color="#726b5f" lineWidth={1} />
    <DimensionLabel key="depth" position={[right + 0.14, 0.6, depth / 2000]} text={fmt(depth)} />
  </group>;
}

function CameraRig({ bounds, fitRevision, viewMode }: { bounds: Bounds3; fitRevision: number; viewMode: 'front' | 'perspective' }) {
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const aspect = size.width / Math.max(1, size.height);
  const fit = useMemo(() => computeCameraFit(bounds, FOV_DEG, aspect, viewMode === 'front' ? { margin: FIT_MARGIN, azimuthDeg: 0, elevationDeg: 2 } : { margin: FIT_MARGIN, azimuthDeg: 24, elevationDeg: 14 }), [bounds, aspect, viewMode]);
  useEffect(() => {
    if (!controls) return;
    camera.position.set(...fit.position);
    controls.target.set(...fit.target);
    controls.minDistance = fit.minDistance;
    controls.maxDistance = fit.maxDistance;
    controls.enableRotate = viewMode !== 'front';
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.far = Math.max(100, fit.maxDistance + 20);
      camera.updateProjectionMatrix();
    }
    controls.update();
  }, [camera, controls, fit, fitRevision, viewMode]);
  return null;
}

function CaptureController() {
  const revision = usePresentationStore((s) => s.captureRevision);
  const lastSeen = useRef(revision);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const pushToast = useAppStore((s) => s.pushToast);
  useEffect(() => {
    if (revision === lastSeen.current) return;
    lastSeen.current = revision;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      // Capture the current scene, not an older preserved frame in demand mode.
      gl.render(scene, camera);
      const canvas = gl.domElement;
      if (canvas.width < 2 || canvas.height < 2 || !canvas.toBlob) {
        pushToast('Captura indisponibilă în această sesiune. Încearcă din nou după reîncadrarea dulapului.', 'error');
        return;
      }
      canvas.toBlob(async (blob) => {
        if (cancelled) return;
        if (!blob || blob.size < 6000) {
          pushToast('Captura nu a produs o imagine randată. Reîncarcă scena și încearcă din nou.', 'error');
          return;
        }
        try {
          const bitmap = await createImageBitmap(blob);
          const exportCanvas = document.createElement('canvas');
          exportCanvas.width = bitmap.width;
          exportCanvas.height = bitmap.height;
          const ctx = exportCanvas.getContext('2d');
          if (!ctx) throw new Error('2D context unavailable');
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close();
          const footerHeight = Math.max(30, Math.round(exportCanvas.height * 0.045));
          ctx.fillStyle = 'rgba(255,255,255,0.92)';
          ctx.fillRect(0, exportCanvas.height - footerHeight, exportCanvas.width, footerHeight);
          ctx.fillStyle = '#514a40';
          ctx.font = `600 ${Math.max(12, Math.round(footerHeight * 0.38))}px system-ui, sans-serif`;
          ctx.textBaseline = 'middle';
          ctx.fillText('CADORO · DEMONSTRAȚIE · CONFIGURAȚIE ILUSTRATIVĂ', Math.round(footerHeight * 0.42), exportCanvas.height - footerHeight / 2);
          exportCanvas.toBlob((finalBlob) => {
            if (!finalBlob || finalBlob.size < 6000) {
              pushToast('Captura PNG nu a putut fi finalizată. Verifică permisiunile browserului.', 'error');
              return;
            }
            const url = URL.createObjectURL(finalBlob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'cadoro-demo-captura.png';
            anchor.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            pushToast('Captura demo a fost salvată ca PNG, fără date personale.', 'success');
          }, 'image/png');
        } catch {
          pushToast('Captura a eșuat în acest browser. Încearcă din nou după reîncărcarea scenei.', 'error');
        }
      }, 'image/png');
    }, 60);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [revision, gl, scene, camera, pushToast]);
  return null;
}

function SceneContents({ design, roomPreset, floorFinish, wallColor, viewMode, showMeasurements, showStyling, showLighting, fitRevision }: {
  design: import('../domain/types').Design;
  roomPreset: 'warm' | 'bright' | 'cool';
  floorFinish: 'oak' | 'herringbone' | 'stone';
  wallColor: string;
  viewMode: 'front' | 'perspective';
  showMeasurements: boolean;
  showStyling: boolean;
  showLighting: boolean;
  fitRevision: number;
}) {
  const layout = useMemo(() => computeLayout(design), [design]);
  const bounds = useMemo(() => wardrobeBounds(
    mm(layout.totalModuleWidth), mm(layout.filler?.width ?? 0), mm(design.wardrobeHeightMm), mm(CARCASS_DEPTH_MM), mm(PLINTH_HEIGHT_MM),
  ), [layout.totalModuleWidth, layout.filler?.width, design.wardrobeHeightMm]);
  const wardrobeWidth = mm(layout.totalModuleWidth + (layout.filler?.width ?? 0));
  const palette = roomPreset === 'warm' ? { hemi: '#fff0db', key: '#fff2df', fill: '#fffaf2', intensity: 1.15 }
    : roomPreset === 'bright' ? { hemi: '#fffdf7', key: '#fffaf0', fill: '#ffffff', intensity: 1.25 }
      : { hemi: '#e8f1ff', key: '#edf4ff', fill: '#f7faff', intensity: 1.08 };
  return <>
    <EnvironmentLighting enabled={showLighting} />
    <color attach="background" args={[wallColor]} />
    <ambientLight intensity={showLighting ? 0.42 : 0.28} color={palette.fill} />
    <hemisphereLight intensity={showLighting ? palette.intensity : 0.58} color={palette.hemi} groundColor="#8a7661" />
    <directionalLight position={[2.8, 5.6, 4.2]} intensity={showLighting ? 1.28 : 0.95} color={palette.key} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={4} shadow-camera-bottom={-1} shadow-bias={-0.00015} />
    <directionalLight position={[-3.2, 2.7, -1.2]} intensity={showLighting ? 0.38 : 0.16} color="#fff7ea" />
    <Room wardrobeWidth={wardrobeWidth} wallColor={wallColor} floorFinish={floorFinish} />
    <Wardrobe design={design} showStyling={showStyling} showLighting={showLighting} />
    {showMeasurements && <Measurements width={layout.totalModuleWidth} height={design.wardrobeHeightMm} depth={CARCASS_DEPTH_MM} />}
    <OrbitControls makeDefault enablePan={false} minDistance={0.8} maxDistance={18} minPolarAngle={0.12} maxPolarAngle={Math.PI / 2 - 0.015} />
    <CameraRig bounds={bounds} fitRevision={fitRevision} viewMode={viewMode} />
    <CaptureController />
  </>;
}

export default function Scene() {
  const design = useAppStore((s) => s.design);
  const roomPreset = usePresentationStore((s) => s.roomPreset);
  const floorFinish = usePresentationStore((s) => s.floorFinish);
  const wallColor = usePresentationStore((s) => s.wallColor);
  const viewMode = usePresentationStore((s) => s.viewMode);
  const showMeasurements = usePresentationStore((s) => s.showMeasurements);
  const showStyling = usePresentationStore((s) => s.showStyling);
  const showLighting = usePresentationStore((s) => s.showLighting);
  const fitRevision = usePresentationStore((s) => s.fitRevision);
  return (
    <Canvas
      frameloop="demand"
      shadows
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
      camera={{ position: [1.6, 1.9, 3.4], fov: FOV_DEG, near: 0.1, far: 100 }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.02; gl.outputColorSpace = THREE.SRGBColorSpace; }}
    >
      <Suspense fallback={null}>
        <SceneContents design={design} roomPreset={roomPreset} floorFinish={floorFinish} wallColor={wallColor} viewMode={viewMode} showMeasurements={showMeasurements} showStyling={showStyling} showLighting={showLighting} fitRevision={fitRevision} />
      </Suspense>
    </Canvas>
  );
}
