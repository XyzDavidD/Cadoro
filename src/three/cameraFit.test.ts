// Projection tests for camera framing. A synthetic perspective camera (three.js
// PerspectiveCamera, no renderer) projects the 8 wardrobe bounding-box corners;
// every corner must land inside the frame with comfortable margins for a range
// of canvas aspect ratios and design shapes.

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { computeCameraFit, wardrobeBounds } from './cameraFit';
import { computeLayout, PLINTH_HEIGHT_MM } from '../domain/layout';
import { CARCASS_DEPTH_MM } from '../domain/catalog';
import { DEFAULT_DESIGN } from '../state/store';
import { carcassGeometry, fittingGeometry, doorGeometry, plinthSpec, mm } from './geometry';
import type { BoxSpec } from './geometry';
import type { Bounds3 } from './cameraFit';

const FOV = 38;
const MARGIN = 0.12;

/** Bounds for a wardrobe `w` m wide, `h` m tall (incl. plinth), `d` m deep. */
function makeBounds(w: number, h: number, d: number): Bounds3 {
  return { minX: -w / 2, maxX: w / 2, minY: 0, maxY: h, minZ: 0, maxZ: d };
}

function corners(b: Bounds3): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (const x of [b.minX, b.maxX]) {
    for (const y of [b.minY, b.maxY]) {
      for (const z of [b.minZ, b.maxZ]) {
        out.push(new THREE.Vector3(x, y, z));
      }
    }
  }
  return out;
}

function projectAll(b: Bounds3, aspect: number): { ndc: THREE.Vector3[]; distance: number } {
  const fit = computeCameraFit(b, FOV, aspect, { margin: MARGIN });
  const cam = new THREE.PerspectiveCamera(FOV, aspect, 0.1, 2000);
  cam.position.set(fit.position[0], fit.position[1], fit.position[2]);
  cam.lookAt(fit.target[0], fit.target[1], fit.target[2]);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
  const ndc = corners(b).map((c) => c.clone().project(cam));
  return { ndc, distance: fit.distance };
}

function expectAllInside(b: Bounds3, aspect: number): void {
  const { ndc, distance } = projectAll(b, aspect);
  expect(distance).toBeGreaterThan(0);
  const limit = 1 - MARGIN + 0.005; // tiny epsilon for float error
  for (const p of ndc) {
    expect(Math.abs(p.x)).toBeLessThanOrEqual(limit);
    expect(Math.abs(p.y)).toBeLessThanOrEqual(limit);
  }
}

describe('computeCameraFit', () => {
  it('centers the target at wardrobe mid-height, not the floor', () => {
    const b = makeBounds(2.0, 2.38, 0.6);
    const fit = computeCameraFit(b, FOV, 1);
    expect(fit.target[1]).toBeCloseTo(2.38 / 2, 6);
    expect(fit.target[0]).toBeCloseTo(0, 6);
  });

  it('places the camera in front of the wardrobe (+Z side)', () => {
    const fit = computeCameraFit(makeBounds(2.0, 2.38, 0.6), FOV, 1.5);
    expect(fit.position[2]).toBeGreaterThan(0.6);
    expect(fit.position[1]).toBeGreaterThan(0.6); // modest elevation, not floor level
  });

  it('frames the default 2 m x 2.38 m wardrobe for aspects 0.5, 1, 1.5, 2.5', () => {
    for (const aspect of [0.5, 1, 1.5, 2.5]) {
      expectAllInside(makeBounds(2.0, 2.38, 0.6), aspect);
    }
  });

  it('frames a 12 m wide, 12-module run for all aspects', () => {
    for (const aspect of [0.5, 1, 1.5, 2.5]) {
      expectAllInside(makeBounds(12.0, 2.38, 0.6), aspect);
    }
  });

  it('frames a tall narrow single-module wardrobe', () => {
    for (const aspect of [0.5, 1, 1.5, 2.5]) {
      expectAllInside(makeBounds(0.5, 2.48, 0.6), aspect);
    }
  });

  it('handles an empty design without NaN or zooming inside', () => {
    const fit = computeCameraFit(makeBounds(0.001, 0.001, 0.6), FOV, 1);
    expect(Number.isFinite(fit.distance)).toBe(true);
    expect(fit.distance).toBeGreaterThanOrEqual(1.0);
    expectAllInside(makeBounds(0.001, 0.001, 0.6), 1);
  });

  it('keeps portrait canvases farther back than landscape for wide runs', () => {
    const b = makeBounds(12, 2.38, 0.6);
    const portrait = computeCameraFit(b, FOV, 0.5).distance;
    const landscape = computeCameraFit(b, FOV, 2.5).distance;
    expect(portrait).toBeGreaterThan(landscape);
  });

  it('exposes zoom limits that bracket the fitted distance', () => {
    const fit = computeCameraFit(makeBounds(2.0, 2.38, 0.6), FOV, 1);
    expect(fit.minDistance).toBeLessThan(fit.distance);
    expect(fit.maxDistance).toBeGreaterThan(fit.distance);
  });
});


describe('actual wardrobe world-space framing', () => {
  it('uses the scene depth origin and includes closed doors and handles', () => {
    const b = wardrobeBounds(2, 0, 2.3, 0.58, 0.08);
    expect(b.minZ).toBe(0);
    expect(b.maxZ).toBeCloseTo(0.66);
    const fit = computeCameraFit(b, FOV, 1);
    expect(fit.target[2]).toBeCloseTo(0.33);
    expect(fit.target[1]).toBeCloseTo(1.19);
  });

  it('includes a right-side filler without shifting the left carcass edge', () => {
    const b = wardrobeBounds(2, 0.05, 2.3, 0.58, 0.08);
    expect(b.minX).toBe(-1);
    expect(b.maxX).toBeCloseTo(1.05);
    expect(computeCameraFit(b).target[0]).toBeCloseTo(0.025);
  });

  it('projects actual default and filler-case mesh corners inside the viewport', () => {
    for (const wallWidthMm of [2500, 2050]) {
      const design = { ...DEFAULT_DESIGN, wallWidthMm };
      const layout = computeLayout(design);
      const b = wardrobeBounds(mm(layout.totalModuleWidth), mm(layout.filler?.width ?? 0), mm(design.wardrobeHeightMm), mm(CARCASS_DEPTH_MM), mm(PLINTH_HEIGHT_MM));
      const meshCorners: THREE.Vector3[] = [];
      const collect = (spec: Pick<BoxSpec, 'pos' | 'size'>, offset: [number, number, number]) => {
        const [x,y,z] = spec.pos.map((v,i) => v + offset[i]);
        meshCorners.push(...corners({ minX: x-spec.size[0]/2, maxX: x+spec.size[0]/2, minY: y-spec.size[1]/2, maxY: y+spec.size[1]/2, minZ: z-spec.size[2]/2, maxZ: z+spec.size[2]/2 }));
      };
      for (const mod of layout.modules) {
        const offset: [number,number,number] = [mm(mod.x-layout.totalModuleWidth/2), mm(PLINTH_HEIGHT_MM), 0];
        for (const spec of [...carcassGeometry(mod,design), ...fittingGeometry(mod,design), ...doorGeometry(mod,design,0)]) collect(spec,offset);
      }
      collect(plinthSpec(layout.totalModuleWidth),[-mm(layout.totalModuleWidth/2),0,0]);
      for (const point of meshCorners) {
        expect(point.x).toBeGreaterThanOrEqual(b.minX-1e-6);
        expect(point.x).toBeLessThanOrEqual(b.maxX+1e-6);
        expect(point.y).toBeGreaterThanOrEqual(b.minY-1e-6);
        expect(point.y).toBeLessThanOrEqual(b.maxY+1e-6);
        expect(point.z).toBeGreaterThanOrEqual(b.minZ-1e-6);
        expect(point.z).toBeLessThanOrEqual(b.maxZ+1e-6);
      }
      for (const aspect of [0.5,1,1.5,2.5]) {
        const fit = computeCameraFit(b,FOV,aspect,{margin:MARGIN});
        const cam = new THREE.PerspectiveCamera(FOV,aspect,0.1,2000);
        cam.position.set(...fit.position);cam.lookAt(...fit.target);cam.updateProjectionMatrix();cam.updateMatrixWorld(true);
        for (const point of meshCorners) {
          const ndc=point.clone().project(cam);
          expect(Math.abs(ndc.x)).toBeLessThanOrEqual(1-MARGIN+0.005);
          expect(Math.abs(ndc.y)).toBeLessThanOrEqual(1-MARGIN+0.005);
        }
      }
    }
  });
});
