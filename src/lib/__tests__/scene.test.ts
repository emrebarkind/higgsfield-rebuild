import { describe, expect, test } from 'vitest';
import * as THREE from 'three';
import { applyPose, viewportFor } from '../render/scene';
import { MOVES, poseAt } from '../moves';

describe('viewportFor', () => {
  test('a 16:9 frame fills a 16:9 canvas', () => {
    expect(viewportFor(1920, 1080, 1344, 756)).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
  });

  test('a 9:16 frame is pillarboxed and centred in 16:9, never stretched', () => {
    const v = viewportFor(1920, 1080, 580, 1015);
    expect(v.height).toBe(1080);
    expect(v.width / v.height).toBeCloseTo(580 / 1015, 2);
    expect(Math.abs(v.x - (1920 - v.width) / 2)).toBeLessThanOrEqual(0.5); // whole pixels
  });

  test('a 5:1 panorama is letterboxed into 9:16 with its full width visible', () => {
    const v = viewportFor(1080, 1920, 5000, 1000);
    expect(v.width).toBe(1080);
    expect(v.height).toBe(216);
    expect(v.y).toBe(852);
  });

  test('returns whole pixels', () => {
    const v = viewportFor(1280, 720, 1015, 580);
    for (const n of [v.x, v.y, v.width, v.height]) expect(Number.isInteger(n)).toBe(true);
  });
});

describe('applyPose', () => {
  const forward = (cam: THREE.PerspectiveCamera) => cam.getWorldDirection(new THREE.Vector3());

  test('copies position and field of view', () => {
    const cam = new THREE.PerspectiveCamera();
    applyPose(cam, { x: 0.1, y: -0.2, z: 2.5, yawDeg: 0, pitchDeg: 0, fovDeg: 40 });
    expect(cam.position.toArray()).toEqual([0.1, -0.2, 2.5]);
    expect(cam.fov).toBe(40);
  });

  test('the base pose looks straight at the plane (−z)', () => {
    const cam = new THREE.PerspectiveCamera();
    applyPose(cam, poseAt('static', { ...MOVES.static.defaults, handheld: 0 }, 0));
    const f = forward(cam);
    expect(f.z).toBeCloseTo(-1);
    expect(Math.abs(f.x)).toBeLessThan(1e-9);
  });

  test('pan-left turns the view to the left (−x), pan-right to the right', () => {
    const p = { ...MOVES['pan-left'].defaults, handheld: 0 };
    const left = new THREE.PerspectiveCamera();
    applyPose(left, poseAt('pan-left', p, 1));
    expect(forward(left).x).toBeLessThan(0);
    const right = new THREE.PerspectiveCamera();
    applyPose(right, poseAt('pan-right', p, 1));
    expect(forward(right).x).toBeGreaterThan(0);
  });

  test('crane-up tilts the view down toward the subject', () => {
    const cam = new THREE.PerspectiveCamera();
    applyPose(cam, poseAt('crane-up', { ...MOVES['crane-up'].defaults, handheld: 0 }, 1));
    expect(cam.position.y).toBeGreaterThan(0);
    expect(forward(cam).y).toBeLessThan(0);
  });

  test('orbit keeps the camera aimed back at the centre line', () => {
    const cam = new THREE.PerspectiveCamera();
    applyPose(cam, poseAt('orbit', { ...MOVES.orbit.defaults, handheld: 0 }, 1));
    expect(cam.position.x).toBeGreaterThan(0);
    expect(forward(cam).x).toBeLessThan(0);
  });
});
