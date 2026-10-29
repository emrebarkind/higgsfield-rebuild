// Browsers drop WebGL contexts under memory pressure (mobile especially, with
// several players open). Calling preventDefault on the loss is what lets the
// browser restore the context later; the player then rebuilds its scene.
export function watchContextLoss(canvas: EventTarget, onLost: () => void, onRestored: () => void): () => void {
  const lost = (e: Event) => {
    e.preventDefault();
    onLost();
  };
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  return () => {
    canvas.removeEventListener('webglcontextlost', lost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
  };
}
