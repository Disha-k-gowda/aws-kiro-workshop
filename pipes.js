import { CONFIG } from './config.js';

export function createPipePool() {
  return { pipes: [], distanceSinceLastSpawn: CONFIG.pipes.spawnInterval }; // spawn immediately
}

export function spawnPipe(pool, canvasWidth, canvasHeight) {
  const half = CONFIG.pipes.gapHeight / 2;
  const min = CONFIG.pipes.gapMinMargin + half;
  const max = canvasHeight - CONFIG.pipes.gapMinMargin - half;
  const gapCentreY = min + Math.random() * (max - min);
  pool.pipes.push({ x: canvasWidth, gapCentreY, scored: false });
  pool.distanceSinceLastSpawn = 0;
}

export function stepPipes(pool, canvasWidth, canvasHeight) {
  pool.distanceSinceLastSpawn += CONFIG.pipes.speed;
  if (pool.distanceSinceLastSpawn >= CONFIG.pipes.spawnInterval) {
    spawnPipe(pool, canvasWidth, canvasHeight);
  }
  for (const p of pool.pipes) {
    p.x -= CONFIG.pipes.speed;
  }
  pool.pipes = pool.pipes.filter(p => p.x + CONFIG.pipes.width > 0);
}

export function checkScoring(pool, playerX) {
  let count = 0;
  for (const p of pool.pipes) {
    const rightEdge = p.x + CONFIG.pipes.width;
    if (!p.scored && rightEdge < playerX) {
      p.scored = true;
      count++;
    }
  }
  return count;
}

export function getCollisionRects(pool, canvasHeight) {
  const rects = [];
  const half = CONFIG.pipes.gapHeight / 2;
  for (const p of pool.pipes) {
    // Top pipe
    rects.push({ x: p.x, y: 0, w: CONFIG.pipes.width, h: p.gapCentreY - half });
    // Bottom pipe
    const bottomY = p.gapCentreY + half;
    rects.push({ x: p.x, y: bottomY, w: CONFIG.pipes.width, h: canvasHeight - bottomY });
  }
  return rects;
}
