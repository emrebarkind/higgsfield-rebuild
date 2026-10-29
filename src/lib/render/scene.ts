// The 2.5D scene: the frame on a subdivided plane, each vertex pushed back
// along the base camera's ray by its depth (docs/spikes.md §2), so the base
// pose shows the image exactly and any other pose shows real parallax.
import * as THREE from 'three';
import { baseFovDeg, DEPTH_SCALE, fitFrame, type CameraPose, type LensMm, type MoveId, type MoveParams, type OutAspect } from '../moves';
import type { Frame } from '../frame';
import type { DepthMap } from '../depth/client';
import { insetRect, witnessView } from './witness';
import { RACK } from '../focus';

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
  /** The browser dropped this scene's WebGL context; nothing it draws shows. */
  lost(): boolean;
  /** Rack focus for this frame (rackFocus), or null for a sharp frame. */
  setFocus(f: { focusDepth: number } | null): void;
  /** Witness scenes only: the path the shot camera travels (poseAt samples). */
  setWitnessPath(poses: CameraPose[]): void;
  /** Witness scenes only: the inset's rect in canvas pixels (GL origin bottom-left). */
  witnessRect(): Rect | null;
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

// The witness view draws the relief as points: gaps where depth jumps read
// honestly, where a mesh seen from the side would stretch into a rubber sheet.
const pointsVertexShader = vertexShader
  .replace('uniform float overscan;', 'uniform float overscan;\n  uniform float pointSize;')
  .replace('gl_Position =', 'gl_PointSize = pointSize;\n    gl_Position =');

const LIME = new THREE.Color('#c5f04a');
const PURPLE = '#6b3cf5';
const INSET_BG = '#111111';
/** Below this inset width (canvas pixels) the witness view is skipped. */
const MIN_INSET = 160;
const WITNESS_LAYER = 1;

// Rack focus: a depth-weighted gather around each pixel. Off (blur = 0) it is
// the plain texture lookup it always was. A tap only counts as far as its own
// blur reaches, so a sharp subject doesn't bleed into a blurred background.
const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform sampler2D depthMap;
  uniform float blur;
  uniform float focusDepth;
  uniform float cocGain;
  uniform float cocMax;
  uniform vec2 texel;
  varying vec2 vUv;
  const vec2 DISC[12] = vec2[12](
    vec2(-0.326, -0.406), vec2(-0.840, -0.074), vec2(-0.696, 0.457), vec2(-0.203, 0.621),
    vec2(0.962, -0.195), vec2(0.473, -0.480), vec2(0.519, 0.767), vec2(0.185, -0.893),
    vec2(0.507, 0.064), vec2(0.896, 0.412), vec2(-0.322, -0.933), vec2(-0.792, -0.598)
  );
  float coc(float d) { return min(abs(d - focusDepth) * cocGain, cocMax); }
  void main() {
    vec4 c = texture2D(map, vUv);
    if (blur <= 0.0) { gl_FragColor = c; return; }
    float r0 = coc(texture2D(depthMap, clamp(vUv, 0.0, 1.0)).r) * blur;
    if (r0 < 0.35) { gl_FragColor = c; return; }
    vec4 acc = c;
    float wsum = 1.0;
    for (int i = 0; i < 12; i++) {
      vec2 uv = vUv + DISC[i] * r0 * texel;
      float r = coc(texture2D(depthMap, clamp(uv, 0.0, 1.0)).r) * blur;
      float w = clamp(r / r0, 0.0, 1.0);
      acc += texture2D(map, uv) * w;
      wsum += w;
    }
    gl_FragColor = acc / wsum;
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
  opts: { lensMm?: LensMm; preserveDrawingBuffer?: boolean; witness?: boolean } = {},
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
      blur: { value: 0 },
      focusDepth: { value: 0 },
      cocGain: { value: RACK.gain },
      cocMax: { value: RACK.maxPx },
      texel: { value: new THREE.Vector2(1 / frame.width, 1 / frame.height) },
    },
  });
  const geometry = new THREE.PlaneGeometry(2 * aspect * OVERSCAN, 2 * OVERSCAN, SEGMENTS, SEGMENTS);
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(geometry, material));
  const camera = new THREE.PerspectiveCamera(baseFovDeg(lens), aspect, 0.01, 100);

  let rect: Rect = { x: 0, y: 0, width: canvas.width, height: canvas.height };
  const witness = opts.witness ? createWitness(scene, material, aspect, lens) : null;

  return {
    canvas,
    lost: () => renderer.getContext().isContextLost(),
    setPose: (p) => applyPose(camera, p),
    setFocus(f) {
      material.uniforms.blur.value = f ? 1 : 0;
      material.uniforms.focusDepth.value = f?.focusDepth ?? 0;
    },
    render() {
      renderer.setScissorTest(false);
      renderer.clear();
      renderer.setViewport(rect.x, rect.y, rect.width, rect.height);
      renderer.setScissor(rect.x, rect.y, rect.width, rect.height);
      renderer.setScissorTest(true);
      renderer.render(scene, camera);
      if (witness) witness.render(renderer, camera, rect);
    },
    setWitnessPath: (poses) => witness?.setPath(poses),
    witnessRect: () => (witness && insetRect(rect).width >= MIN_INSET ? insetRect(rect) : null),
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
      witness?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

/** The witness view's objects, all on WITNESS_LAYER so the shot camera never sees them. */
function createWitness(scene: THREE.Scene, material: THREE.ShaderMaterial, aspect: number, lens: LensMm) {
  const pointsGeo = new THREE.PlaneGeometry(2 * aspect * OVERSCAN, 2 * OVERSCAN, 120, 120);
  const pointsMat = new THREE.ShaderMaterial({
    vertexShader: pointsVertexShader,
    fragmentShader,
    uniforms: { ...material.uniforms, pointSize: { value: 3 } },
  });
  const points = new THREE.Points(pointsGeo, pointsMat);

  // A stand-in for the shot camera whose frustum reaches the photo, drawn in lime.
  const d = 1 / Math.tan((baseFovDeg(lens) / 2) * RAD);
  const stand = new THREE.PerspectiveCamera(baseFovDeg(lens), aspect, 0.2, d + DEPTH_SCALE * 0.5);
  const helper = new THREE.CameraHelper(stand);
  helper.setColors(LIME, LIME, LIME, LIME, LIME);

  const pathGeo = new THREE.BufferGeometry();
  const pathMat = new THREE.LineBasicMaterial({ color: LIME, transparent: true, opacity: 0.6 });
  const path = new THREE.Line(pathGeo, pathMat);

  for (const o of [points, helper, path]) {
    o.layers.set(WITNESS_LAYER);
    scene.add(o);
  }

  const view = witnessView(lens, aspect);
  const cam = new THREE.PerspectiveCamera(view.fovDeg, 16 / 10, 0.05, 100);
  cam.layers.set(WITNESS_LAYER);
  cam.position.set(...view.position);
  cam.lookAt(...view.target);

  return {
    setPath(poses: CameraPose[]) {
      pathGeo.setFromPoints(poses.map((p) => new THREE.Vector3(p.x, p.y, p.z)));
    },
    render(renderer: THREE.WebGLRenderer, shot: THREE.PerspectiveCamera, frameRect: Rect) {
      const r = insetRect(frameRect);
      if (r.width < MIN_INSET) return;
      stand.position.copy(shot.position);
      stand.rotation.copy(shot.rotation);
      stand.fov = shot.fov;
      stand.updateProjectionMatrix();
      stand.updateMatrixWorld(true);
      helper.update();
      cam.aspect = r.width / r.height;
      cam.updateProjectionMatrix();
      // A purple border, then the dark inset, then the witness camera's view of layer 1.
      const b = Math.max(2, Math.round(r.width * 0.008));
      renderer.setScissor(r.x - b, r.y - b, r.width + 2 * b, r.height + 2 * b);
      renderer.setClearColor(PURPLE, 1);
      renderer.clear();
      renderer.setViewport(r.x, r.y, r.width, r.height);
      renderer.setScissor(r.x, r.y, r.width, r.height);
      renderer.setClearColor(INSET_BG, 1);
      renderer.render(scene, cam);
      renderer.setClearColor(BAR, 1);
    },
    dispose() {
      pointsGeo.dispose();
      pointsMat.dispose();
      pathGeo.dispose();
      pathMat.dispose();
      helper.dispose();
    },
  };
}

