import { CONFIG } from './config.js';

export function createParticleSystem() {
  return { particles: [], lastTrailTime: 0 };
}

export function emitTrail(system, x, y, velocityY, now) {
  const interval = 1000 / CONFIG.fx.particlesPerSecond;
  if (now - system.lastTrailTime < interval) return;
  system.lastTrailTime = now;

  const duration = CONFIG.fx.particleFadeDuration +
    (Math.random() * 200 - 100); // 400–600ms range

  system.particles.push({
    x: x + (Math.random() - 0.5) * 10,
    y: y + (Math.random() - 0.5) * 10,
    vx: -(Math.random() * 1.5 + 0.5),
    vy: -velocityY * 0.15 + (Math.random() - 0.5),
    opacity: CONFIG.fx.particleStartOpacity,
    born: now,
    duration,
    type: 'trail',
  });
}

export function emitScorePop(system, x, y, now) {
  system.particles.push({
    x,
    y,
    vx: 0,
    vy: -CONFIG.fx.scorePopDistance / (CONFIG.fx.scorePopDuration / 16),
    opacity: 1,
    born: now,
    duration: CONFIG.fx.scorePopDuration,
    type: 'scorePop',
    label: '+1',
  });
}

export function stepParticles(system, now) {
  for (const p of system.particles) {
    const elapsed = now - p.born;
    const t = Math.min(elapsed / p.duration, 1);
    p.opacity = (1 - t) * (p.type === 'trail' ? CONFIG.fx.particleStartOpacity : 1);
    p.x += p.vx;
    p.y += p.vy;
  }
  system.particles = system.particles.filter(p => now - p.born < p.duration);
}

export function getParticles(system) {
  return system.particles;
}
