// The 3D wardrobe scene. Procedural geometry from the deterministic layout plan.
// No IKEA assets or code; everything is generated from our own demo catalog.

import { useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useAppStore } from '../state/store';
import { computeLayout } from '../domain/layout';
import { CARCASS_DEPTH_MM } from '../domain/catalog';
import { carcassColor, carcassGeometry, doorGeometry, fittingGeometry, plinthSpec, mm } from './geometry';
import type { DoorSpec } from './geometry';
import { PLINTH_HEIGHT_MM } from '../domain/layout';
import { computeCameraFit, wardrobeBounds } from './cameraFit';
import type { Bounds3 } from './cameraFit';

function Box({ spec, selected }: { spec: { pos: [number, number, number]; size: [number, number, number]; color: string }; selected?: boolean }) {
  return (
    <mesh position={spec.pos} castShadow receiveShadow>
      <boxGeometry args={spec.size} />
      <meshStandardMaterial color={spec.color} roughness={0.65} metalness={0.05} />
      {selected && <lineSegments><edgesGeometry args={[new THREE.BoxGeometry(...spec.size)]} /><lineBasicMaterial color="#c8a26a" /></lineSegments>}
    </mesh>
  );
}

function Door({ spec }: { spec: DoorSpec }) {
  const isOpen = Math.abs(spec.openAngle) > 0.01;
  const groupOffset: [number, number, number] =
    spec.kind === 'hinged'
      ? [spec.pos[0] - (spec.hingeSide === 'left' ? spec.size[0] / 2 : -spec.size[0] / 2), spec.pos[1], spec.pos[2]]
      : spec.pos;
  const pivotShift: [number, number, number] =
    spec.kind === 'hinged' ? [spec.hingeSide === 'left' ? spec.size[0] / 2 : -spec.size[0] / 2, 0, 0] : [0, 0, 0];
  return (
    <group position={groupOffset} rotation={[0, isOpen ? spec.openAngle : 0, 0]}>
      <mesh position={pivotShift} castShadow>
        <boxGeometry args={spec.size} />
        <meshStandardMaterial color={spec.color} roughness={spec.kind === 'hinged' ? 0.4 : 0.35} metalness={0.08} />
      </mesh>
      {/* handle */}
      <mesh
        position={[
          pivotShift[0] + (spec.hingeSide === 'left' ? -spec.size[0] / 2 + 0.06 : spec.size[0] / 2 - 0.06),
          0,
          spec.kind === 'hinged' ? 0.018 : 0.02,
        ]}
      >
        <cylinderGeometry args={[0.012, 0.012, 0.28, 12]} />
        <meshStandardMaterial color="#8f949c" roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  );
}

const FOV_DEG = 38;
const FIT_MARGIN = 0.12;

/** Applies the computed fit to camera + controls whenever the structural
 *  dimensions, the viewport aspect, or an explicit user refit change.
 *  Finish/selection changes keep the same bounds object, so no reset happens. */
function CameraRig({ bounds, manualToken }: { bounds: Bounds3; manualToken: number }) {
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera);
  // drei's makeDefault registers the controls instance here once mounted,
  // which also solves ref-readiness on the very first frame.
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const aspect = size.width / Math.max(1, size.height);
  const fit = useMemo(() => computeCameraFit(bounds, FOV_DEG, aspect, { margin: FIT_MARGIN }), [bounds, aspect]);

  useEffect(() => {
    if (!controls) return;
    camera.position.set(fit.position[0], fit.position[1], fit.position[2]);
    controls.target.set(fit.target[0], fit.target[1], fit.target[2]);
    controls.minDistance = fit.minDistance;
    controls.maxDistance = fit.maxDistance;
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.far = Math.max(100, fit.maxDistance + 20);
      camera.updateProjectionMatrix();
    }
    controls.update();
  }, [camera, controls, fit, manualToken]);

  return null;
}

function Wardrobe({ design }: { design: import('../domain/types').Design }) {
  const selectedModuleId = useAppStore((s) => s.selectedModuleId);
  const select = useAppStore((s) => s.select);
  const doorsOpen = useAppStore((s) => s.doorsOpen);
  const openAmount = doorsOpen ? 1 : 0;
  const layout = useMemo(() => computeLayout(design), [design]);

  const center = layout.totalModuleWidth / 2;
  const carcassColorHex = carcassColor(design.carcassFinishCode);

  const onClickModule = (id: string) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    select(id === selectedModuleId ? null : id);
  };

  return (
    <group position={[-center / 1000, 0, 0]}>
      {/* plinth */}
      {layout.totalModuleWidth > 0 && (
        <mesh position={plinthSpec(layout.totalModuleWidth).pos} castShadow receiveShadow>
          <boxGeometry args={plinthSpec(layout.totalModuleWidth).size} />
          <meshStandardMaterial color={plinthSpec(layout.totalModuleWidth).color} roughness={0.6} />
        </mesh>
      )}
      {layout.modules.map((mod) => {
        const selected = mod.spec.id === selectedModuleId;
        const color = carcassColorHex;
        return (
          <group key={mod.spec.id} position={[mod.x / 1000, PLINTH_HEIGHT_MM / 1000, 0]} onClick={onClickModule(mod.spec.id)}>
            {carcassGeometry(mod, design).map((b, i) => (
              <Box key={i} spec={{ ...b, color }} selected={selected && i === 0} />
            ))}
            {fittingGeometry(mod, design).map((b, i) => (
              <Box key={i} spec={b} />
            ))}
            {doorGeometry(mod, design, openAmount).map((d, i) => (
              <Door key={i} spec={d} />
            ))}
          </group>
        );
      })}
      {/* filler panel */}
      {layout.filler && (
        <mesh position={[mm(layout.filler.x + layout.filler.width / 2), mm((design.wardrobeHeightMm + PLINTH_HEIGHT_MM) / 2), mm(CARCASS_DEPTH_MM / 2)]} castShadow>
          <boxGeometry args={[mm(layout.filler.width), mm(design.wardrobeHeightMm), mm(18)]} />
          <meshStandardMaterial color={carcassColorHex} roughness={0.6} />
        </mesh>
      )}
    </group>
  );
}

export default function Scene() {
  const design = useAppStore((s) => s.design);
  const layout = useMemo(() => computeLayout(design), [design]);
  const [manualToken, setManualToken] = useState(0);

  // Bounds depend only on structural dimensions, so selection, finish changes
  // and other harmless state changes reuse the same object and never refit.
  const bounds = useMemo(
    () => wardrobeBounds(mm(layout.totalModuleWidth), mm(layout.filler?.width ?? 0), mm(design.wardrobeHeightMm), mm(CARCASS_DEPTH_MM), mm(PLINTH_HEIGHT_MM)),
    [layout.totalModuleWidth, layout.filler?.width, design.wardrobeHeightMm]
  );

  return (
    <>
      <Canvas shadows camera={{ position: [1.6, 1.9, 3.4], fov: FOV_DEG, near: 0.1, far: 100 }} dpr={[1, 2]}>
        <color attach="background" args={['#17181b']} />
        <hemisphereLight intensity={0.55} groundColor="#202126" />
        <directionalLight position={[3, 5, 4]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
        <directionalLight position={[-3, 2.5, -2]} intensity={0.4} />
        <Wardrobe design={design} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[12, 12]} />
          <meshStandardMaterial color="#232428" roughness={0.9} />
        </mesh>
        <ContactShadows position={[0, 0.001, 0]} opacity={0.5} scale={12} blur={2.4} far={3} />
        <OrbitControls makeDefault enablePan={false} minDistance={1.2} maxDistance={8} maxPolarAngle={Math.PI / 2.05} />
        <CameraRig bounds={bounds} manualToken={manualToken} />
      </Canvas>
      <button
        type="button"
        className="fit-view-btn"
        aria-label="Încadrează dulapul complet în vizualizare"
        title="Încadrează dulapul"
        onClick={() => setManualToken((t) => t + 1)}
      >
        Încadrează dulapul
      </button>
    </>
  );
}
