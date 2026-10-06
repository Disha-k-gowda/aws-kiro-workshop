import { CONFIG } from './config.js';

export function createPlayer(canvasWidth, canvasHeight) {
  const x = canvasWidth * CONFIG.player.startXPercent;
  const y = canvasHeight / 2;
  return { x, y, prevY: y, renderY: y, velocityY: 0, alive: true };
}

export function applyFlap(player) {
  player.velocityY = CONFIG.physics.flapVelocity;
}

export function stepPhysics(player) {
  player.prevY = player.y;
  player.velocityY += CONFIG.physics.gravity;
  if (player.velocityY > CONFIG.physics.terminalVelocity) {
    player.velocityY = CONFIG.physics.terminalVelocity;
  }
  player.y += player.velocityY;
}

export function stepRender(player) {
  player.renderY = player.prevY + (player.y - player.prevY) * CONFIG.physics.lerpFactor;
}

export function getHitbox(player) {
  const inset = CONFIG.player.hitboxInset;
  const hw = CONFIG.player.spriteWidth;
  const hh = CONFIG.player.spriteHeight;
  const ix = hw * inset;
  const iy = hh * inset;
  return {
    x: player.x - hw / 2 + ix,
    y: player.renderY - hh / 2 + iy,
    w: hw - ix * 2,
    h: hh - iy * 2,
  };
}

export function getSpriteAngle(player) {
  const v = player.velocityY;
  const tv = CONFIG.physics.terminalVelocity;
  const tiltUp = CONFIG.player.tiltUp;
  const tiltDown = CONFIG.player.tiltDown;
  if (v <= 0) return tiltUp;
  const t = Math.min(v / tv, 1);
  return tiltUp + (tiltDown - tiltUp) * t;
}

export function checkCollision(player, pipeRects, canvasHeight) {
  const hb = getHitbox(player);
  // Ground
  if (hb.y + hb.h >= canvasHeight) return true;
  // Ceiling
  if (hb.y <= 0) return true;
  // Pipes (AABB)
  for (const r of pipeRects) {
    if (
      hb.x < r.x + r.w &&
      hb.x + hb.w > r.x &&
      hb.y < r.y + r.h &&
      hb.y + hb.h > r.y
    ) {
      return true;
    }
  }
  return false;
}
