// The 30-second product film (docs/film/BRIEF.md): every colour, word and
// timing in one place. Times are in seconds.
import { MOVES, type MoveParams } from '../lib/moves';

export const FILM = { width: 1920, height: 1080, fps: 30, durationS: 30 };

export const COLORS = {
  paper: '#ffffff',
  panel: '#f4f4f1',
  line: '#e2e2dc',
  ink: '#111111',
  muted: '#5c5c66',
  lime: '#c5f04a',
  purple: '#6b3cf5',
  monitor: '#0b0b0a',
};

export const COPY = {
  open: ['A still.', 'A real camera.'],
  studio: { label: 'Studio', headline: ['Your photo.', 'A real camera move.'], depth: 'Reading depth · in your browser', live: 'Live · Push in · 35mm' },
  takes: { label: 'Takes', headline: ['Roll three.', 'Keep one.'], roll: 'Roll 3 takes', circled: 'Circled' },
  witness: {
    label: 'Witness cam',
    headline: ['See the camera,', 'not just the shot.'],
    steps: ['Roll', 'Circle', 'Export'],
    export: 'Export MP4 · 1080p',
    rendering: (n: number) => `Rendering ${n} / 141 frames`,
    done: 'dailies-shot01-take2-push-in.mp4',
  },
  close: { wordmark: 'Dailies', line: 'A real camera for your still images.', sub: 'Free · in your browser · no credits' },
  moves: Object.values(MOVES).map((m) => m.label),
};

/** Scene boundaries. */
export const T = { studio: 4, takes: 12, witness: 17, close: 23, hold: 27 };

/** The three takes: the same push-in, varied the way rolled takes vary. Take 2 is the keeper. */
const base: MoveParams = { ...MOVES['push-in'].defaults, lensMm: 35 };
export const TAKES: { params: MoveParams; seed: number }[] = [
  { params: { ...base, strength: 0.5, handheld: 0.12 }, seed: 11 },
  { params: { ...base, strength: 0.62, handheld: 0.2 }, seed: 12 },
  { params: { ...base, strength: 0.72, handheld: 0.15 }, seed: 13 },
];
export const KEEPER = 1;
export const SAMPLE_ID = 'landscape';
