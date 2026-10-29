// Draws one frame of the product film at time t (seconds) onto a 1920×1080
// 2D canvas. Deterministic: the same t always draws the same frame, so the
// preview and the MP4 render match. Camera shots come from Dailies' own
// renderer (createScene) and witness cam, drawn in as images.
import { poseAt } from '../lib/moves';
import type { Scene } from '../lib/render/scene';
import { COLORS, COPY, FILM, KEEPER, T, TAKES } from './config';

export interface FilmAssets {
  photo: ImageBitmap;
  depthImage: ImageBitmap;
  /** 16:9 shot scene (1280×720). */
  shot: Scene;
  /** Large scene with the witness inset, cropped out for the witness view. */
  witness: Scene;
  frameAspect: number;
  fonts: { display: string; ui: string; mono: string };
}

type Ctx = CanvasRenderingContext2D;
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const { width: W, height: H } = FILM;
const L = 120;

// --- timing ---
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const out3 = (v: number) => 1 - (1 - v) ** 3;
const inOut = (v: number) => (v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpBox = (a: Box, b: Box, k: number): Box => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) });
/** Fade in over [a, a+0.5], out over [b-0.4, b]. */
const life = (t: number, a: number, b: number) => out3(seg(t, a, a + 0.5)) * (1 - seg(t, b - 0.4, b));

// --- layout ---
const MONITOR: Box = { x: 820, y: 250, w: 980, h: 551 };
const TAKE_W = 540;
const TAKE_H = 304;
const TAKE_BOXES: Box[] = [0, 1, 2].map((i) => ({ x: 110 + i * (TAKE_W + 40), y: 420, w: TAKE_W, h: TAKE_H }));
const SHOT_BIG: Box = { x: 110, y: 300, w: 960, h: 540 };
const WITNESS_BIG: Box = { x: 1110, y: 300, w: 700, h: 438 };
const CLOSE_SHOT: Box = { x: 520, y: 110, w: 880, h: 495 };
const CLOSE_WITNESS: Box = { x: 1210, y: 80, w: 330, h: 206 };

// --- drawing helpers ---
function text(ctx: Ctx, s: string, x: number, y: number, o: { font: string; size: number; weight?: number; color?: string; alpha?: number; align?: CanvasTextAlign; spacing?: number; upper?: boolean }) {
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.font = `${o.weight ?? 400} ${o.size}px ${o.font}`;
  ctx.fillStyle = o.color ?? COLORS.ink;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = `${o.spacing ?? 0}px`;
  ctx.fillText(o.upper ? s.toUpperCase() : s, x, y);
  ctx.restore();
}

function roundRect(ctx: Ctx, b: Box, r: number, fill: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function stroke(ctx: Ctx, b: Box, r: number, color: string, width: number, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.beginPath();
  ctx.roundRect(b.x - width / 2, b.y - width / 2, b.w + width, b.h + width, r + width / 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

/** Words rise into place one after another. */
function kinetic(ctx: Ctx, lines: string[], x: number, y: number, size: number, t: number, start: number, font: string, alpha = 1, lineGap = 1.02) {
  let i = 0;
  lines.forEach((line, li) => {
    let cx = x;
    for (const word of line.split(' ')) {
      const k = out3(seg(t, start + i * 0.12, start + i * 0.12 + 0.55));
      ctx.save();
      ctx.font = `700 ${size}px ${font}`;
      ctx.letterSpacing = '1px';
      const w = ctx.measureText(word.toUpperCase() + ' ').width;
      ctx.restore();
      text(ctx, word, cx, y + li * size * lineGap + (1 - k) * 36, { font, size, weight: 700, alpha: alpha * k, spacing: 1, upper: true });
      cx += w;
      i++;
    }
  });
}

function label(ctx: Ctx, s: string, x: number, y: number, a: AssetsFonts, alpha: number) {
  text(ctx, s, x, y, { font: a.mono, size: 22, weight: 700, color: COLORS.purple, alpha, spacing: 3, upper: true });
}
type AssetsFonts = FilmAssets['fonts'];

/** The connecting element: the lime camera path. */
function limeLine(ctx: Ctx, x0: number, x1: number, y: number, width: number, alpha = 1) {
  if (x1 <= x0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = COLORS.lime;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  ctx.restore();
}

function shotAt(a: FilmAssets, take: number, k: number) {
  const { params, seed } = TAKES[take];
  return poseAt('push-in', params, k, seed, a.frameAspect);
}

/** Render the shot camera at pose k and draw it into box, clipped to rounded corners. */
function drawShot(ctx: Ctx, a: FilmAssets, take: number, k: number, b: Box, alpha = 1) {
  a.shot.setPose(shotAt(a, take, k));
  a.shot.render();
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 10);
  ctx.clip();
  ctx.drawImage(a.shot.canvas as CanvasImageSource, b.x, b.y, b.w, b.h);
  ctx.restore();
}

/** Render the witness scene and draw its inset (the witness cam's view) into box. */
function drawWitness(ctx: Ctx, a: FilmAssets, k: number, b: Box, alpha: number) {
  a.witness.setPose(shotAt(a, KEEPER, k));
  a.witness.render();
  const r = a.witness.witnessRect();
  if (!r) return;
  const ch = (a.witness.canvas as HTMLCanvasElement | OffscreenCanvas).height;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 10);
  ctx.clip();
  ctx.drawImage(a.witness.canvas as CanvasImageSource, r.x, ch - r.y - r.height, r.width, r.height, b.x, b.y, b.w, b.h);
  ctx.restore();
  stroke(ctx, b, 10, COLORS.purple, 5, alpha);
  roundRect(ctx, { x: b.x + 14, y: b.y + 14, w: 170, h: 34 }, 4, COLORS.purple, alpha);
  text(ctx, 'Witness cam', b.x + 26, b.y + 38, { font: a.fonts.mono, size: 17, weight: 700, color: '#ffffff', alpha, spacing: 2, upper: true });
}

function tag(ctx: Ctx, s: string, x: number, y: number, a: AssetsFonts, alpha: number) {
  ctx.save();
  ctx.font = `700 16px ${a.mono}`;
  ctx.letterSpacing = '2px';
  const w = ctx.measureText(s.toUpperCase()).width;
  ctx.restore();
  roundRect(ctx, { x, y, w: w + 24, h: 32 }, 4, 'rgba(255,255,255,0.88)', alpha);
  text(ctx, s, x + 12, y + 22, { font: a.mono, size: 16, weight: 700, alpha, spacing: 2, upper: true });
}

// --- scenes ---
export function drawFilmFrame(ctx: Ctx, t: number, a: FilmAssets) {
  const f = a.fonts;
  ctx.save();
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, W, H);

  // Opening (0–4): the claim, and the lime line drawing beneath it.
  if (t < T.studio + 0.6) {
    const fade = 1 - seg(t, 3.3, 4.0);
    kinetic(ctx, COPY.open, L, 470, 150, t, 0.25, f.display, fade);
    limeLine(ctx, L, lerp(L, W - L, inOut(seg(t, 1.2, 2.8))), 700, 10, 1);
  }

  // Studio (4–12).
  if (t >= T.studio - 0.2 && t < T.takes + 1) {
    const a1 = life(t, T.studio + 0.1, T.takes);
    label(ctx, COPY.studio.label, L, 300, f, a1);
    kinetic(ctx, COPY.studio.headline, L, 390, 72, t, T.studio + 0.2, f.display, 1 - seg(t, T.takes - 0.4, T.takes));
    // Monitor arrives; until the morph into take 2 it holds the frame.
    const mIn = out3(seg(t, 4.2, 5.0));
    const morph = inOut(seg(t, T.takes, T.takes + 0.8));
    const mon = lerpBox({ ...MONITOR, y: MONITOR.y + (1 - mIn) * 60 }, TAKE_BOXES[KEEPER], morph);
    roundRect(ctx, mon, 10, COLORS.monitor, mIn);
    if (t < 7.2) {
      // The still, then its depth sweeping across it.
      ctx.save();
      ctx.globalAlpha = out3(seg(t, 4.5, 5.1));
      ctx.beginPath();
      ctx.roundRect(mon.x, mon.y, mon.w, mon.h, 10);
      ctx.clip();
      ctx.drawImage(a.photo, mon.x, mon.y, mon.w, mon.h);
      const sweep = inOut(seg(t, 5.3, 6.3));
      const back = seg(t, 6.5, 7.2);
      const edge = mon.x + mon.w * sweep;
      ctx.globalAlpha = 1 - back;
      ctx.drawImage(a.depthImage, 0, 0, a.depthImage.width * sweep, a.depthImage.height, mon.x, mon.y, mon.w * sweep, mon.h);
      if (sweep > 0 && sweep < 1) limeLine(ctx, edge, edge + 0.01, mon.y + mon.h / 2, 0, 0);
      ctx.restore();
      if (sweep > 0 && sweep < 1) {
        ctx.save();
        ctx.fillStyle = COLORS.lime;
        ctx.fillRect(edge - 3, mon.y, 6, mon.h);
        ctx.restore();
      }
      const capA = life(t, 5.2, 7.2);
      text(ctx, COPY.studio.depth, mon.x, mon.y + mon.h + 50, { font: f.mono, size: 20, color: COLORS.muted, alpha: capA, spacing: 2, upper: true });
    } else {
      // The real camera: Dailies' renderer, push in.
      const k = seg(t, 7.6, 11.4);
      drawShot(ctx, a, KEEPER, k, mon);
      tag(ctx, COPY.studio.live, mon.x + 16, mon.y + 16, f, 1 - morph);
    }
    // Move chips, then the lime line as the move's progress.
    const chipsA = life(t, 6.4, T.takes);
    if (chipsA > 0) {
      let cx = MONITOR.x;
      const cy = MONITOR.y + MONITOR.h + 34;
      COPY.moves.forEach((m, i) => {
        const k = out3(seg(t, 6.4 + i * 0.05, 6.9 + i * 0.05));
        const chosen = m === 'Push in' && t > 7.2;
        ctx.save();
        ctx.font = `500 18px ${f.ui}`;
        const w = ctx.measureText(m).width + 26;
        ctx.restore();
        const b = { x: cx, y: cy + (1 - k) * 12, w, h: 38 };
        roundRect(ctx, b, 6, chosen ? COLORS.purple : COLORS.panel, chipsA * k);
        text(ctx, m, b.x + 13, b.y + 26, { font: f.ui, size: 18, weight: 500, color: chosen ? '#ffffff' : COLORS.muted, alpha: chipsA * k });
        cx += w + 8;
      });
    }
    const lineK = seg(t, 7.6, 11.4);
    const fromOpen = inOut(seg(t, 3.6, 4.6));
    const lineY = lerp(700, MONITOR.y + MONITOR.h + 14, fromOpen);
    const x0 = lerp(L, MONITOR.x, fromOpen);
    const x1 = t < 7.6 ? lerp(W - L, MONITOR.x, fromOpen) : MONITOR.x + MONITOR.w * lineK;
    limeLine(ctx, x0, x1, lineY, lerp(10, 6, fromOpen), 1 - morph);
  }

  // Takes (12–17).
  if (t >= T.takes && t < T.witness + 1) {
    const a2 = life(t, T.takes + 0.3, T.witness);
    label(ctx, COPY.takes.label, L, 150, f, a2);
    kinetic(ctx, COPY.takes.headline, L, 240, 72, t, T.takes + 0.3, f.display, 1 - seg(t, T.witness - 0.4, T.witness));
    // Roll 3 takes: a press.
    const press = seg(t, 12.7, 12.85) * (1 - seg(t, 12.85, 13.0));
    const btnA = life(t, 12.3, T.witness);
    const btn = { x: 1360 - press * 4, y: 200 + press * 2, w: 330 - press * 8, h: 76 - press * 4 };
    roundRect(ctx, btn, 8, COLORS.lime, btnA);
    text(ctx, COPY.takes.roll, btn.x + btn.w / 2, btn.y + btn.h / 2 + 12, { font: f.display, size: 34, weight: 700, alpha: btnA, align: 'center', spacing: 1, upper: true });

    const grow = inOut(seg(t, T.witness, T.witness + 0.8));
    const k = seg(t, 13.0, 16.4);
    TAKES.forEach((_, i) => {
      const arrive = i === KEEPER ? 1 : out3(seg(t, 12.9 + (i === 0 ? 0 : 0.15), 13.5 + (i === 0 ? 0 : 0.15)));
      const dim = i === KEEPER ? 1 : 1 - 0.65 * seg(t, 15.4, 16.2);
      const leave = i === KEEPER ? 1 : 1 - seg(t, T.witness, T.witness + 0.5);
      let b = { ...TAKE_BOXES[i], y: TAKE_BOXES[i].y + (1 - arrive) * 50 };
      if (i === KEEPER) b = lerpBox(TAKE_BOXES[i], SHOT_BIG, grow);
      if (i !== KEEPER && t < 12.9) return;
      if (i === KEEPER && t < T.takes + 0.8) return; // still the morphing monitor
      drawShot(ctx, a, i, i === KEEPER && t >= T.witness ? 0 : k, b, arrive * dim * leave);
      if (t < T.witness) {
        text(ctx, `Shot 01 · Take ${i + 1} · Push in · 35mm`, b.x, b.y + b.h + 34, { font: f.mono, size: 17, color: COLORS.muted, alpha: arrive * dim, spacing: 1.5, upper: true });
      }
    });
    // Circle take 2.
    const circ = out3(seg(t, 15.0, 15.4));
    if (circ > 0 && t < T.witness + 0.8) {
      const b = lerpBox(TAKE_BOXES[KEEPER], SHOT_BIG, grow);
      stroke(ctx, b, 10, COLORS.purple, 7, circ);
      const bw = 150;
      roundRect(ctx, { x: b.x + b.w - bw - 14, y: b.y + 14, w: bw, h: 36 }, 4, COLORS.purple, circ * (1 - grow));
      text(ctx, COPY.takes.circled, b.x + b.w - bw / 2 - 14, b.y + 39, { font: f.mono, size: 17, weight: 700, color: '#ffffff', alpha: circ * (1 - grow), align: 'center', spacing: 2, upper: true });
    }
  }

  // Witness cam (17–23).
  if (t >= T.witness && t < T.close + 1.4) {
    const a3 = life(t, T.witness + 0.3, T.close);
    label(ctx, COPY.witness.label, L, 150, f, a3);
    kinetic(ctx, COPY.witness.headline, L, 228, 64, t, T.witness + 0.3, f.display, 1 - seg(t, T.close - 0.4, T.close));
    const k = seg(t, 17.9, 21.6);
    const settle = inOut(seg(t, T.close, T.close + 1.2));
    const kClose = seg(t, 24.0, T.hold);
    const kk = t < T.close ? k : kClose;
    if (t >= T.witness + 0.8) {
      const shotBox = lerpBox(SHOT_BIG, CLOSE_SHOT, settle);
      drawShot(ctx, a, KEEPER, kk, shotBox);
      stroke(ctx, shotBox, 10, COLORS.purple, 7, 1 - settle);
    }
    const wIn = out3(seg(t, 17.5, 18.3));
    const wBox = lerpBox({ ...WITNESS_BIG, y: WITNESS_BIG.y + (1 - wIn) * 40 }, CLOSE_WITNESS, settle);
    if (t < T.close + 1.4) drawWitness(ctx, a, kk, wBox, wIn);

    // The human action, explicit: Roll → Circle → Export.
    const stepsA = life(t, 18.4, T.close);
    let sx = WITNESS_BIG.x;
    COPY.witness.steps.forEach((s, i) => {
      const done = i < 2 || t > 21.0;
      const on = (i === 2 && t > 21.0) || (i < 2 && t > 18.4 + i * 0.4);
      text(ctx, s, sx, WITNESS_BIG.y + WITNESS_BIG.h + 58, { font: f.display, size: 40, weight: 700, color: on ? (i === 1 ? COLORS.purple : COLORS.ink) : COLORS.muted, alpha: stepsA * (done ? 1 : 0.5), spacing: 1, upper: true });
      ctx.save();
      ctx.font = `700 40px ${f.display}`;
      ctx.letterSpacing = '1px';
      sx += ctx.measureText(s.toUpperCase()).width + 16;
      ctx.restore();
      if (i < 2) {
        text(ctx, '→', sx, WITNESS_BIG.y + WITNESS_BIG.h + 56, { font: f.ui, size: 34, color: COLORS.muted, alpha: stepsA });
        sx += 50;
      }
    });

    // Export: the button, then the real frame count filling.
    const exA = life(t, 20.6, T.close);
    if (exA > 0) {
      const y = SHOT_BIG.y + SHOT_BIG.h + 30;
      const press = seg(t, 21.0, 21.12) * (1 - seg(t, 21.12, 21.25));
      roundRect(ctx, { x: SHOT_BIG.x + press * 3, y: y + press * 2, w: 300 - press * 6, h: 58 - press * 4 }, 8, COLORS.lime, exA);
      text(ctx, COPY.witness.export, SHOT_BIG.x + 150, y + 38, { font: f.ui, size: 22, weight: 600, alpha: exA, align: 'center' });
      const p = seg(t, 21.2, 22.5);
      const bar = { x: SHOT_BIG.x + 324, y: y + 24, w: SHOT_BIG.w - 324, h: 10 };
      roundRect(ctx, bar, 5, COLORS.panel, exA);
      roundRect(ctx, { ...bar, w: bar.w * p }, 5, COLORS.ink, exA);
      const n = Math.round(141 * p);
      text(ctx, p < 1 ? COPY.witness.rendering(n) : COPY.witness.done, bar.x, y - 2, { font: f.mono, size: 17, color: p < 1 ? COLORS.muted : COLORS.ink, alpha: exA, spacing: 1.5 });
    }
  }

  // Closing (23–30): one composition, then the wordmark. Still from T.hold.
  if (t >= T.close + 1.2) {
    const wm = out3(seg(t, 24.4, 25.2));
    text(ctx, COPY.close.wordmark, W / 2, 790 + (1 - wm) * 30, { font: f.display, size: 150, weight: 700, alpha: wm, align: 'center', spacing: 4, upper: true });
    const ul = inOut(seg(t, 24.8, 25.8));
    limeLine(ctx, W / 2 - 260 * ul, W / 2 + 260 * ul, 822, 10, 1);
    text(ctx, COPY.close.line, W / 2, 890, { font: f.ui, size: 40, weight: 500, alpha: out3(seg(t, 25.2, 25.9)), align: 'center' });
    text(ctx, COPY.close.sub, W / 2, 950, { font: f.mono, size: 22, color: COLORS.muted, alpha: out3(seg(t, 25.5, 26.2)), align: 'center', spacing: 3, upper: true });
  }
  ctx.restore();
}
