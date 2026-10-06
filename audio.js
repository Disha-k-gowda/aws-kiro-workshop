import { CONFIG } from './config.js';

export function createAudioManager() {
  // HTMLAudioElement sounds
  const flapAudio = _loadAudio('assets/jump.wav');
  const gameOverAudio = _loadAudio('assets/game_over.wav');

  // Web Audio API for music and score sound
  let audioCtx = null;
  let musicGain = null;
  let musicOscillators = [];
  let musicRunning = false;

  function _getCtx() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch { return null; }
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function _startMusic() {
    const ctx = _getCtx();
    if (!ctx || musicRunning) return;
    musicRunning = true;

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.04;
    musicGain.connect(ctx.destination);

    // Simple looping two-oscillator pad: drone notes
    const freqs = [130.81, 164.81]; // C3, E3
    musicOscillators = freqs.map(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(musicGain);
      osc.start();
      return osc;
    });
  }

  function _stopMusic() {
    if (!musicRunning) return;
    musicRunning = false;
    for (const osc of musicOscillators) {
      try { osc.stop(); } catch { }
    }
    musicOscillators = [];
    if (musicGain) {
      musicGain.disconnect();
      musicGain = null;
    }
  }

  return {
    playFlap() {
      if (!flapAudio) return;
      flapAudio.currentTime = 0;
      flapAudio.play().catch(() => {});
    },
    playGameOver() {
      if (!gameOverAudio) return;
      gameOverAudio.currentTime = 0;
      gameOverAudio.play().catch(() => {});
    },
    playScoreSound() {
      const ctx = _getCtx();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } catch { }
    },
    startMusic() {
      _startMusic();
    },
    pauseMusic() {
      if (!audioCtx || !musicRunning) return;
      audioCtx.suspend().catch(() => {});
    },
    resumeMusic() {
      if (!audioCtx) {
        _startMusic();
        return;
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      if (!musicRunning) _startMusic();
    },
    stopMusic() {
      _stopMusic();
    },
  };
}

function _loadAudio(src) {
  try {
    const audio = new Audio(src);
    return audio;
  } catch {
    return null;
  }
}
