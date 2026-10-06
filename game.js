import { CONFIG } from './config.js';
import { loadHighScore, saveHighScore } from './storage.js';
import { createInputHandler } from './input.js';
import { createPlayer, applyFlap, stepPhysics, stepRender, checkCollision } from './player.js';
import { createPipePool, stepPipes, checkScoring, getCollisionRects } from './pipes.js';
import { createAudioManager } from './audio.js';
import { createParticleSystem, emitTrail, emitScorePop, stepParticles, getParticles } from './particles.js';
import { drawFrame, stepClouds, resetClouds } from './renderer.js';

// ---- State enum ----
export const GameState = Object.freeze({
  MAIN_MENU: 'MAIN_MENU',
  ACTIVE:    'ACTIVE',
  PAUSED:    'PAUSED',
  GAME_OVER: 'GAME_OVER',
});

// ---- Canvas setup ----
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  const vw = window.innerWidth  || CONFIG.display.fallbackWidth;
  const vh = window.innerHeight || CONFIG.display.fallbackHeight;
  canvas.width  = vw || CONFIG.display.fallbackWidth;
  canvas.height = vh || CONFIG.display.fallbackHeight;
}
resizeCanvas();

// ---- Load sprite ----
const spriteImg = new Image();
spriteImg.src = 'assets/ghosty.png';

// ---- Modules ----
const audio   = createAudioManager();
const input   = createInputHandler(canvas);
const storage = { loadHighScore, saveHighScore };

// ---- Game state ----
let state      = GameState.MAIN_MENU;
let score      = 0;
let highScore  = loadHighScore();
let player     = createPlayer(canvas.width, canvas.height);
let pipePool   = createPipePool();
let particles  = createParticleSystem();

// Screen shake
let shakeEndTime   = 0;
let shakeStartTime = 0;

// Timing guards
let gameOverTime   = 0;
let lastTimestamp  = 0;

// ---- Helpers ----
function getShakeOffset(now) {
  if (now >= shakeEndTime) return { x: 0, y: 0 };
  const elapsed  = now - shakeStartTime;
  const duration = CONFIG.display.shakeDuration;
  const decay    = 1 - Math.min(elapsed / duration, 1);
  const amp      = CONFIG.display.shakeAmplitude * decay;
  return {
    x: (Math.random() * 2 - 1) * amp,
    y: (Math.random() * 2 - 1) * amp,
  };
}

function triggerGameOver(now) {
  state        = GameState.GAME_OVER;
  gameOverTime = now;
  audio.playGameOver();
  audio.stopMusic();

  shakeStartTime = now;
  shakeEndTime   = now + CONFIG.display.shakeDuration;

  if (score > highScore) {
    highScore = score;
    saveHighScore(highScore);
  }
}

function resetGame() {
  score     = 0;
  player    = createPlayer(canvas.width, canvas.height);
  pipePool  = createPipePool();
  particles = createParticleSystem();
  resetClouds();
}

// ---- Update ----
function update(now) {
  const shake = getShakeOffset(now);

  if (state === GameState.MAIN_MENU) {
    stepClouds(canvas.width, canvas.height);
    if (input.consumeFlap()) {
      resetGame();
      state = GameState.ACTIVE;
      audio.startMusic();
    }
    return { shakeX: 0, shakeY: 0 };
  }

  if (state === GameState.PAUSED) {
    if (input.consumePause() || input.consumeFlap()) {
      state = GameState.ACTIVE;
      audio.resumeMusic();
    }
    // Drain restart queue to avoid accidental re-fire
    input.consumeRestart();
    return { shakeX: 0, shakeY: 0 };
  }

  if (state === GameState.GAME_OVER) {
    stepClouds(canvas.width, canvas.height);
    const elapsed = now - gameOverTime;
    if (elapsed >= CONFIG.fx.restartDelay) {
      // Drain all queued inputs that arrived before the delay expired, then check
      if (input.consumeRestart() || input.consumeFlap()) {
        resetGame();
        state = GameState.MAIN_MENU;
      }
    }
    return { shakeX: shake.x, shakeY: shake.y };
  }

  // ---- ACTIVE ----
  if (input.consumePause()) {
    state = GameState.PAUSED;
    audio.pauseMusic();
    return { shakeX: 0, shakeY: 0 };
  }

  if (input.consumeFlap()) {
    applyFlap(player);
    audio.playFlap();
  }

  stepPhysics(player);
  stepRender(player);
  stepPipes(pipePool, canvas.width, canvas.height);
  stepClouds(canvas.width, canvas.height);

  // Scoring
  const scored = checkScoring(pipePool, player.x);
  if (scored > 0) {
    score += scored;
    audio.playScoreSound();
    emitScorePop(particles, player.x + 30, canvas.height * 0.9 - 20, now);
  }

  // Particle trail
  emitTrail(particles, player.x, player.renderY, player.velocityY, now);
  stepParticles(particles, now);

  // Collision — only outside invincibility window
  const sinceGameOver = now - gameOverTime;
  if (sinceGameOver > CONFIG.fx.invincibilityFrames) {
    const pipeRects = getCollisionRects(pipePool, canvas.height);
    if (checkCollision(player, pipeRects, canvas.height)) {
      triggerGameOver(now);
    }
  }

  return { shakeX: shake.x, shakeY: shake.y };
}

// ---- Game loop ----
function gameLoop(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  lastTimestamp = timestamp;

  const { shakeX, shakeY } = update(timestamp);

  const snapshot = {
    w:         canvas.width,
    h:         canvas.height,
    player,
    pipes:     pipePool.pipes,
    particles: getParticles(particles),
    score,
    highScore,
    state,
    shakeX,
    shakeY,
    spriteImg,
  };

  drawFrame(ctx, snapshot);
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
