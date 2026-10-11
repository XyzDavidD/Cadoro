import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { applyPhysicalPanelUvs, doorHandleLocalX, doorPose, physicalPanelUv, roomDimensions, surfaceFinish } from './materials';
import { wardrobeBounds } from './cameraFit';
import { carcassGeometry, doorGeometry, fittingGeometry } from './geometry';
import { computeLayout } from '../domain/layout';
import type { Design, ModuleSpec } from '../domain/types';

describe('local material mapping', () => {
  it('selects distinct, local texture sets for oak, walnut and derived smoked oak', () => {
    const oak = surfaceFinish('DEMO-wood-oak');
    const walnut = surfaceFinish('DEMO-wood-walnut');
    const smoked = surfaceFinish('DEMO-wood-smoked');
    expect(oak.baseColor).toContain('/oak/basecolor-1k.webp');
    expect(walnut.baseColor).toContain('/walnut/basecolor-1k.webp');
    expect(smoked.baseColor).toContain('/smoked-oak/basecolor.webp');
    expect(new Set([oak.baseColor, walnut.baseColor, smoked.baseColor]).size).toBe(3);
    expect(oak.color).toBe('#ffffff');
    expect(walnut.color).toBe('#ffffff');
    expect(oak.normal).toContain('normal-1k.webp');
    expect(oak.roughness).toContain('roughness-1k.webp');
    expect(surfaceFinish('DEMO-lacquer-white').baseColor).toBeNull();
  });

  it('maps broad wood panel faces at the measured physical tile scale', () => {
    const frontOak = physicalPanelUv(0.4, 1.15, 0, 0, 0, 1, [0.8, 2.3, 0.018], 1.83);
    expect(frontOak[0]).toBeCloseTo(0.8 / 1.83, 8);
    expect(frontOak[1]).toBeCloseTo(2.3 / 1.83, 8);
    const frontWalnut = physicalPanelUv(0.4, 1.15, 0, 0, 0, 1, [0.8, 2.3, 0.018], 1, true);
    expect(frontWalnut[0]).toBeCloseTo(2.3, 8);
    expect(frontWalnut[1]).toBeCloseTo(0.8, 8);
  });

  it('writes repeatable UVs per face without changing box dimensions', () => {
    const geometry = new THREE.BoxGeometry(0.8, 2.3, 0.018);
    const before = geometry.getAttribute('position').count;
    applyPhysicalPanelUvs(geometry, [0.8, 2.3, 0.018], 1.83);
    const uv = geometry.getAttribute('uv');
    expect(uv.count).toBe(before);
    const maxV = Math.max(...Array.from({ length: uv.count }, (_, i) => uv.getY(i)));
    expect(maxV).toBeCloseTo(2.3 / 1.83, 3);
    expect(geometry.boundingBox).toBeNull();
    geometry.dispose();
  });

  it('gives hinged and sliding leaves different opening motions without rotation on sliders', () => {
    const closedHinge = doorPose('hinged', 'left', 0.3, 0.6, 0);
    const openHinge = doorPose('hinged', 'left', 0.3, 0.6, 1);
    const closedSlide = doorPose('sliding', 'left', 0.2, 0.4, 0);
    const openSlide = doorPose('sliding', 'left', 0.2, 0.4, 1);
    expect(closedHinge.angle).toBeCloseTo(0, 8);
    expect(openHinge.angle).toBeLessThan(-1);
    expect(openHinge.x).toBe(closedHinge.x);
    expect(openSlide.angle).toBeCloseTo(0, 8);
    expect(openSlide.x).toBeGreaterThan(closedSlide.x);
    expect(openSlide.x - closedSlide.x).toBeCloseTo(0.168);
  });



  it('assigns the selected finish to carcass, shelves, drawer faces and door leaves', () => {
    const mod: ModuleSpec = {
      id: 'M01', width: 800, doorType: 'hinged', doorFinishCode: 'DEMO-wood-oak',
      fittings: [
        { id: 'M01-F1', kind: 'shelf', y: 1200 },
        { id: 'M01-F2', kind: 'drawers', y: 0, drawersCount: 2 },
      ],
    };
    const design: Design = { wallWidthMm: 800, wardrobeHeightMm: 2200, carcassFinishCode: 'DEMO-wood-walnut', modules: [mod] };
    const plan = computeLayout(design).modules[0];
    const carcass = carcassGeometry(plan, design);
    const fittings = fittingGeometry(plan, design);
    const doors = doorGeometry(plan, design, 1);
    expect(carcass.every((part) => part.surface === 'finish')).toBe(true);
    expect(fittings.filter((part) => part.surface === 'finish').every((part) => part.finishCode === 'DEMO-wood-walnut')).toBe(true);
    expect(fittings.some((part) => part.surface === 'metal')).toBe(true);
    expect(doors[0].finishCode).toBe('DEMO-wood-oak');
    expect(surfaceFinish(doors[0].finishCode).baseColor).toContain('/oak/');
  });

  it('places pulls on the free edge of hinged leaves and the facing edges of sliders', () => {
    expect(doorHandleLocalX('hinged', 'left', 0.6)).toBeCloseTo(0.535, 8);
    expect(doorHandleLocalX('hinged', 'right', 0.6)).toBeCloseTo(-0.535, 8);
    expect(doorHandleLocalX('sliding', 'left', 0.4)).toBeCloseTo(0.135, 8);
    expect(doorHandleLocalX('sliding', 'right', 0.4)).toBeCloseTo(-0.135, 8);
  });

  it('scales room framing to the wardrobe while wardrobe fit bounds stay room-independent', () => {
    const smallRoom = roomDimensions(2);
    const largeRoom = roomDimensions(4.5);
    expect(largeRoom.width).toBeGreaterThan(smallRoom.width);
    expect(smallRoom.wallHeight).toBeCloseTo(3.05);
    const fit = wardrobeBounds(2, 0, 2.3, 0.58, 0.08);
    expect(fit.maxX - fit.minX).toBe(2);
    expect(fit.maxY).toBeCloseTo(2.38);
    expect(fit.maxZ).toBeCloseTo(0.66);
    expect(fit.maxX).toBeLessThan(smallRoom.width / 2);
  });
});
