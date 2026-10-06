import { CONFIG } from './config.js';
import { getSpriteAngle } from './player.js';

// Cloud state lives here (initialised once, updated each frame)
let clouds = [];
let cloudsInitialised = false;

function initClouds(canvasWidth, canvasHeight) {
  clouds = [];
  const maxY = canvasHeight * (2 / 3);
  CONFIG.clouds.forEach((layer, layerIdx) => {
    for (let i = 0; i < layer.count; i++) {
      const opacity = layer.opacityMin + Math.random() * (layer.opacityMax - layer.opacityMin);
      clouds.push({
        x: Math.random() * canvasWidth,
        y: 40 + Math.random() * (maxY - 40),
        w: 80 + Math.random() * 60,
        h: 35 + Math.random() * 25,
        opacity,
        layer: layerIdx,
      });
    }
  });
  cloudsInitialised = true;
}

export function stepClouds(canvasWidth, canvasHeight) {
  if (!cloudsInitialised) initClouds(canvasWidth, canvasHeight);
  const maxY = canvasHeight * (2 / 3);
  for (const c of clouds) {
    const speed = CONFIG.clouds[c.layer].speed;
    c.x -= speed;
    if (c.x + c.w < 0) {
      c.x = canvasWidth + Math.random() * 60;
      c.y = 40 + Math.random() * (maxY - 40);
    }
  }
}

export function resetClouds() {
  cloudsInitialised = false;
}

// ---- Sketchy drawing helpers ----

function sketchyRect(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);

  // Rough overlay lines for sketchy texture
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < w; i += 8) {
    ctx.beginPath();
    ctx.moveTo(x + i + (Math.random() - 0.5) * 2, y);
    ctx.lineTo(x + i + (Math.random() - 0.5) * 2, y + h);
    ctx.stroke();
  }
  // Border
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.restore();
}

function drawCloud(ctx, c) {
  ctx.save();
  ctx.globalAlpha = c.opacity;
  ctx.fillStyle = '#e8f4f8';
  // Draw as overlapping ellipses
  ctx.beginPath();
  ctx.ellipse(c.x + c.w * 0.3, c.y + c.h * 0.6, c.w * 0.35, c.h * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(c.x + c.w * 0.6, c.y + c.h * 0.55, c.w * 0.32, c.h * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(c.x + c.w * 0.5, c.y + c.h * 0.35, c.w * 0.28, c.h * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBackground(ctx, w, h) {
  ctx.fillStyle = CONFIG.display.backgroundColor;
  ctx.fillRect(0, 0, w, h);

  // Subtle sketchy texture lines
  ctx.save();
  ctx.strokeStyle = 'rgba(100,180,210,0.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 18; i++) {
    const x1 = Math.random() * w;
    const y1 = Math.random() * h;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + (Math.random() - 0.5) * 120, y1 + (Math.random() - 0.5) * 120);
    ctx.stroke();
  }
  ctx.restore();
}

// ---- Main draw function ----

export function drawFrame(ctx, snapshot) {
  const { w, h, player, pipes, particles, score, highScore,
          state, shakeX, shakeY, spriteImg } = snapshot;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // 1. Background
  drawBackground(ctx, w, h);

  // 2. Clouds (both layers — far drawn first via sort order in clouds array)
  if (!cloudsInitialised) initClouds(w, h);
  // Draw far layer first (layer 0), then near (layer 1)
  for (const layer of [0, 1]) {
    for (const c of clouds) {
      if (c.layer === layer) drawCloud(ctx, c);
    }
  }

  // 3. Pipes
  const half = CONFIG.pipes.gapHeight / 2;
  for (const p of pipes) {
    const topH = p.gapCentreY - half;
    const botY = p.gapCentreY + half;
    const botH = h - botY;
    if (topH > 0) {
      sketchyRect(ctx, p.x, 0, CONFIG.pipes.width, topH, CONFIG.display.pipeColor);
      // Pipe cap
      ctx.fillStyle = '#3a6b22';
      ctx.fillRect(p.x - 4, topH - 14, CONFIG.pipes.width + 8, 14);
    }
    if (botH > 0) {
      sketchyRect(ctx, p.x, botY, CONFIG.pipes.width, botH, CONFIG.display.pipeColor);
      // Pipe cap
      ctx.fillStyle = '#3a6b22';
      ctx.fillRect(p.x - 4, botY, CONFIG.pipes.width + 8, 14);
    }
  }

  // 4. Particle trail (behind Kiro)
  for (const p of particles) {
    if (p.type !== 'trail') continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.opacity);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 5. Kiro sprite
  if (spriteImg && spriteImg.complete) {
    const angle = getSpriteAngle(player) * (Math.PI / 180);
    const sw = CONFIG.player.spriteWidth;
    const sh = CONFIG.player.spriteHeight;
    ctx.save();
    ctx.translate(player.x, player.renderY);
    ctx.rotate(angle);
    ctx.drawImage(spriteImg, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();
  } else {
    // Fallback ghost shape
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(player.x, player.renderY, 18, Math.PI, 0);
    ctx.lineTo(player.x + 18, player.renderY + 18);
    ctx.lineTo(player.x - 18, player.renderY + 18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 6. Score pop particles
  for (const p of particles) {
    if (p.type !== 'scorePop') continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.opacity);
    ctx.fillStyle = '#ffff00';
    ctx.font = `bold 20px ${CONFIG.display.scoreFontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillText(p.label, p.x, p.y);
    ctx.restore();
  }

  // 7. Score panel (bottom 10%)
  const panelY = h * 0.9;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, panelY, w, h - panelY);
  ctx.fillStyle = '#ffffff';
  ctx.font = `${CONFIG.display.scoreFontSize}px ${CONFIG.display.scoreFontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText(`Score: ${score} | High: ${highScore}`, w / 2, panelY + (h - panelY) / 2 + 7);

  ctx.restore(); // end shake translate

  // 8. State overlays (rendered outside shake)
  if (state === 'MAIN_MENU') {
    _drawOverlay(ctx, w, h, [
      { text: 'FLAPPY KIRO', size: 42, color: '#fff', y: h * 0.35 },
      { text: `High Score: ${highScore}`, size: 22, color: '#ffe066', y: h * 0.47 },
      { text: 'Press Space or Tap to Start', size: 18, color: '#cceeff', y: h * 0.58 },
    ]);
  } else if (state === 'PAUSED') {
    _drawOverlay(ctx, w, h, [
      { text: 'PAUSED', size: 40, color: '#fff', y: h * 0.42 },
      { text: 'Press Space, P or Esc to Resume', size: 16, color: '#cceeff', y: h * 0.54 },
    ]);
  } else if (state === 'GAME_OVER') {
    _drawOverlay(ctx, w, h, [
      { text: 'GAME OVER', size: 40, color: '#ff6666', y: h * 0.38 },
      { text: `Score: ${score}`, size: 26, color: '#fff', y: h * 0.50 },
      { text: 'Press Space or Tap to Restart', size: 16, color: '#cceeff', y: h * 0.61 },
    ]);
  }
}

function _drawOverlay(ctx, w, h, lines) {
  ctx.fillStyle = 'rgba(0,0,0,0.52)';
  ctx.fillRect(0, 0, w, h);
  for (const line of lines) {
    ctx.font = `bold ${line.size}px ${CONFIG.display.scoreFontFamily}`;
    ctx.fillStyle = line.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(line.text, w / 2, line.y);
  }
  ctx.textBaseline = 'alphabetic';
}
