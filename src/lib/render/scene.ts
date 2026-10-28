// The 2.5D scene: the frame on a subdivided plane, each vertex pushed back
// along the base camera's ray by its depth (docs/spikes.md §2), so the base
// pose shows the image exactly and any other pose shows real parallax.
import * as THREE from 'three';
import { baseFovDeg, DEPTH_SCALE, fitFrame, type CameraPose, type LensMm, type MoveId, type MoveParams, type OutAspect } from '../moves';
import type { Frame } from '../frame';
import type { DepthMap } from '../depth/client';

export interface TakeRecipe {
  frame: Frame;
  depth: DepthMap;
  moveId: MoveId;
  params: MoveParams;
  seed: number;
}

export interface Scene {
  setPose(p: CameraPose): void;
  render(): void;
  resize(w: number, h: number, aspect: OutAspect): void;
  dispose(): void;
  canvas: HTMLCanvasElement | OffscreenCanvas;
}

const OVERSCAN = 1.06;
const SEGMENTS = 256;
const RAD = Math.PI / 180;
/** Letterbox bars: near-black, as on a monitor, not the UI graphite. */
const BAR = '#0b0b0a';
const ASPECT: Record<OutAspect, number> = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1 };

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Contain-fit a frame inside a canvas, in whole canvas pixels (GL origin: bottom-left). */
export function viewportFor(canvasW: number, canvasH: number, frameW: number, frameH: number): Rect {
  const k = Math.min(canvasW / frameW, canvasH / frameH);
  const width = Math.min(canvasW, Math.round(frameW * k));
  const height = Math.min(canvasH, Math.round(frameH * k));
  return { x: Math.round((canvasW - width) / 2), y: Math.round((canvasH - height) / 2), width, height };
}

/** The output rect for `aspect` inside the canvas, then the frame inside it via fitFrame. */
function frameRect(canvasW: number, canvasH: number, frame: { width: number; height: number }, aspect: OutAspect): Rect {
  const out = viewportFor(canvasW, canvasH, ASPECT[aspect], 1);
  const fit = fitFrame(frame.width, frame.height, aspect);
  const height = Math.round(out.height * fit.scale);
  const width = Math.min(out.width, Math.round((height * frame.width) / frame.height));
  return {
    x: out.x + Math.round((out.width - width) / 2),
    y: out.y + Math.round((out.height - height) / 2),
    width,
    height,
  };
}

export function applyPose(cam: THREE.PerspectiveCamera, p: CameraPose) {
  cam.position.set(p.x, p.y, p.z);
  cam.rotation.set(p.pitchDeg * RAD, p.yawDeg * RAD, 0, 'YXZ');
  cam.fov = p.fovDeg;
  cam.updateProjectionMatrix();
}

const vertexShader = /* glsl */ `
  uniform sampler2D depthMap;
  uniform float depthScale;
  uniform float baseDist;
  uniform float overscan;
  varying vec2 vUv;
  void main() {
    // image uv; it runs past 0..1 in the overscan border
    vec2 iuv = (uv - 0.5) * overscan + 0.5;
    vUv = vec2(iuv.x, 1.0 - iuv.y);
    float d = texture2D(depthMap, clamp(vUv, 0.0, 1.0)).r;
    float off = (1.0 - d) * depthScale;
    float k = (baseDist + off) / baseDist;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy * k, -off, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  varying vec2 vUv;
  void main() {
    gl_FragColor = texture2D(map, vUv);
  }
`;

function depthTexture(depth: DepthMap): THREE.DataTexture {
  const bytes = new Uint8Array(depth.data.length);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Math.round(depth.data[i] * 255);
  const tex = new THREE.DataTexture(bytes, depth.width, depth.height, THREE.RedFormat, THREE.UnsignedByteType);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function createScene(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  frame: ImageBitmap,
  depth: DepthMap,
  opts: { lensMm?: LensMm; preserveDrawingBuffer?: boolean } = {},
): Scene {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: opts.preserveDrawingBuffer ?? false,
  });
  renderer.setClearColor(BAR, 1);

  const map = new THREE.Texture(frame);
  map.flipY = false; // ImageBitmaps can't be flipped on upload; the shader flips v instead
  map.colorSpace = THREE.NoColorSpace; // pass-through: the shader writes the image's own bytes
  map.wrapS = map.wrapT = THREE.MirroredRepeatWrapping; // overscan border mirrors the edge
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.needsUpdate = true;
  const dmap = depthTexture(depth);

  const aspect = frame.width / frame.height;
  const lens = opts.lensMm ?? 35;
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      map: { value: map },
      depthMap: { value: dmap },
      depthScale: { value: DEPTH_SCALE },
      baseDist: { value: 1 / Math.tan((baseFovDeg(lens) / 2) * RAD) },
      overscan: { value: OVERSCAN },
    },
  });
  const geometry = new THREE.PlaneGeometry(2 * aspect * OVERSCAN, 2 * OVERSCAN, SEGMENTS, SEGMENTS);
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(geometry, material));
  const camera = new THREE.PerspectiveCamera(baseFovDeg(lens), aspect, 0.01, 100);

  let rect: Rect = { x: 0, y: 0, width: canvas.width, height: canvas.height };

  return {
    canvas,
    setPose: (p) => applyPose(camera, p),
    render() {
      renderer.setScissorTest(false);
      renderer.clear();
      renderer.setViewport(rect.x, rect.y, rect.width, rect.height);
      renderer.setScissor(rect.x, rect.y, rect.width, rect.height);
      renderer.setScissorTest(true);
      renderer.render(scene, camera);
    },
    resize(w, h, outAspect) {
      renderer.setPixelRatio(1); // callers pass device pixels
      renderer.setSize(w, h, false);
      rect = frameRect(w, h, frame, outAspect);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      map.dispose();
      dmap.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
