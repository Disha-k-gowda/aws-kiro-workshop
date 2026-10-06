export function createInputHandler(canvas) {
  let flapQueued = false;
  let pauseQueued = false;
  let restartQueued = false;

  function onKey(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      flapQueued = true;
      restartQueued = true;
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
      pauseQueued = true;
    }
  }

  function onPointer(e) {
    e.preventDefault();
    flapQueued = true;
    restartQueued = true;
  }

  window.addEventListener('keydown', onKey);
  canvas.addEventListener('pointerdown', onPointer);

  return {
    consumeFlap() {
      if (flapQueued) { flapQueued = false; return true; }
      return false;
    },
    consumePause() {
      if (pauseQueued) { pauseQueued = false; return true; }
      return false;
    },
    consumeRestart() {
      if (restartQueued) { restartQueued = false; return true; }
      return false;
    },
    destroy() {
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('pointerdown', onPointer);
    },
  };
}
