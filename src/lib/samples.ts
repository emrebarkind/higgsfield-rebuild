import { MOVES, type MoveId, type MoveParams } from './moves';

// Sample frames we generated with Pollinations (keyless) on 28 Oct 2026 and
// committed under public/samples. Always shown with the label "Sample".
export interface Sample {
  id: string;
  src: string;
  prompt: string;
  moveId: MoveId;
  params: MoveParams;
}

const sample = (id: string, prompt: string, moveId: MoveId, over: Partial<MoveParams> = {}): Sample => ({
  id,
  src: `/samples/${id}.jpg`,
  prompt,
  moveId,
  params: { ...MOVES[moveId].defaults, ...over },
});

export const SAMPLES: Sample[] = [
  sample(
    'landscape',
    'A misty mountain lake at sunrise, pine trees in the foreground, mountains layered into the distance, cinematic wide shot',
    'push-in',
  ),
  sample(
    'portrait',
    'Portrait of a woman in a yellow raincoat on a rainy city street at night, neon reflections, shallow depth of field, 35mm film still',
    'dolly-zoom',
  ),
  sample(
    'product',
    'A ceramic coffee cup on a wooden table by a window, soft morning light, studio product photo, background softly out of focus',
    'orbit',
  ),
  sample(
    'interior',
    'A quiet library reading room with long wooden tables, green lamps and tall bookshelves receding into the distance, warm light',
    'crane-up',
  ),
];
