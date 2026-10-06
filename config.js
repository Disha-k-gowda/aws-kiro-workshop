export const CONFIG = Object.freeze({

  physics: Object.freeze({
    gravity: 0.5,
    flapVelocity: -8,
    terminalVelocity: 10,
    lerpFactor: 0.85,
  }),

  pipes: Object.freeze({
    speed: 3,
    spawnInterval: 300,
    gapHeight: 150,
    gapMinMargin: 60,
    width: 60,
  }),

  player: Object.freeze({
    hitboxInset: 0.20,
    spriteWidth: 50,
    spriteHeight: 50,
    startXPercent: 0.20,
    tiltUp: 10,
    tiltDown: -25,
  }),

  display: Object.freeze({
    fallbackWidth: 480,
    fallbackHeight: 640,
    scoreFontSize: 18,
    scoreFontFamily: '"Courier New", Courier, monospace',
    shakeAmplitude: 8,
    shakeDuration: 400,
    pipeColor: '#4a7c2f',
    backgroundColor: '#7ec8d8',
  }),

  clouds: Object.freeze([
    Object.freeze({ speed: 0.5, opacityMin: 0.3, opacityMax: 0.5, count: 2 }),
    Object.freeze({ speed: 1.5, opacityMin: 0.5, opacityMax: 0.7, count: 2 }),
  ]),

  fx: Object.freeze({
    particlesPerSecond: 10,
    particleFadeDuration: 500,
    particleStartOpacity: 0.8,
    scorePopDistance: 30,
    scorePopDuration: 600,
    invincibilityFrames: 200,
    restartDelay: 300,
  }),

});
