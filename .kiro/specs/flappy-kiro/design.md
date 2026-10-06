# Flappy Kiro — Design Document

## Overview

Flappy Kiro is a pure browser game built with HTML, CSS, and vanilla JavaScript (ES modules). The player controls a ghost sprite (Kiro) by tapping or clicking to apply an upward impulse, navigating through scrolling pipe obstacles. The game runs inside a single `<canvas>` element, driven by `requestAnimationFrame`. No build step, no framework, no external dependencies.

The architecture is organised as a set of small, single-responsibility ES modules that all import their constants from a central `config.js`. The game loop lives in `game.js` and orchestrates every other module each frame.

---

## Architecture

### Module / File Structure

```
flappy-kiro/
├── index.html          # Entry point — canvas, module script tag
├── config.js           # ← FIRST-CLASS: all constants live here
├── game.js             # Game loop, state machine, orchestration
├── player.js           # Kiro physics: position, velocity, hitbox
├── pipes.js            # Pipe pool: spawn, scroll, remove
├── renderer.js         # All canvas draw calls, in draw-order
├── audio.js            # HTMLAudioElement manager with fallback
├── particles.js        # Particle trail and score pop FX
├── input.js            # Keyboard and pointer event normalisation
├── storage.js          # localStorage read/write for high score
└── assets/
    ├── ghosty.png
    ├── jump.wav
    └── game_over.wav
```

`index.html` is the only HTML file. It sizes the canvas to the viewport and loads `game.js` as the root module:

```html
<canvas id="game-canvas"></canvas>
<script type="module" src="game.js"></script>
```

### Dependency Graph

```
index.html
  └── game.js
        ├── config.js      ← imported by ALL modules
        ├── player.js      ← imports config.js
        ├── pipes.js       ← imports config.js
        ├── renderer.js    ← imports config.js
        ├── audio.js       ← imports config.js
        ├── particles.js   ← imports config.js
        ├── input.js       ← imports config.js
        └── storage.js     ← imports config.js
```

Every module imports constants **only** from `config.js`. No magic numbers appear in any other file.

---

## The CONFIG Object (config.js)

`config.js` exports a single frozen object `CONFIG` with six named sub-objects. Freezing prevents accidental mutation at runtime.

```js
// config.js
export const CONFIG = Object.freeze({

  physics: Object.freeze({
    gravity: 0.5,            // px/frame² — added to velocity each frame
    flapVelocity: -8,        // px/frame  — set on flap input (negative = up)
    terminalVelocity: 10,    // px/frame  — max downward speed (positive = down)
    lerpFactor: 0.85,        // 0–1       — rendered pos = lerp(prev, physics, factor)
  }),

  pipes: Object.freeze({
    speed: 3,                // px/frame  — how fast pipes scroll left
    spawnInterval: 300,      // px        — horizontal distance between pipe spawns
    gapHeight: 150,          // px        — vertical opening between top and bottom pipe
    gapMinMargin: 60,        // px        — minimum distance from canvas edge to gap edge
    width: 60,               // px        — rendered pipe width
  }),

  player: Object.freeze({
    hitboxInset: 0.20,       // 0–1       — fraction of sprite dimensions to inset hitbox
    spriteWidth: 50,         // px        — rendered width of ghosty.png
    spriteHeight: 50,        // px        — rendered height of ghosty.png
    startXPercent: 0.20,     // 0–1       — horizontal start as fraction of canvas width
    tiltUp: 10,              // degrees   — sprite rotation when rising (velocity <= 0)
    tiltDown: -25,           // degrees   — sprite rotation when at terminal velocity
  }),

  display: Object.freeze({
    fallbackWidth: 480,      // px — used if viewport dimensions unavailable
    fallbackHeight: 640,     // px
    scoreFontSize: 18,       // px — minimum legible size
    scoreFontFamily: '"Courier New", Courier, monospace',
    shakeAmplitude: 8,       // px — max canvas offset during screen shake
    shakeDuration: 400,      // ms
    pipeColor: '#4a7c2f',
    backgroundColor: '#7ec8d8',
  }),

  clouds: [
    // Far layer — slow, faint
    Object.freeze({ speed: 0.5, opacityMin: 0.3, opacityMax: 0.5, count: 2 }),
    // Near layer — faster, more visible
    Object.freeze({ speed: 1.5, opacityMin: 0.5, opacityMax: 0.7, count: 2 }),
  ],

  fx: Object.freeze({
    particlesPerSecond: 10,        // particles emitted per second in Active state
    particleFadeDuration: 500,     // ms — particle lives this long, fading to 0
    particleStartOpacity: 0.8,
    scorePopDistance: 30,          // px — "+1" floats upward this far
    scorePopDuration: 600,         // ms
    invincibilityFrames: 200,      // ms — ignore collisions after game over
    restartDelay: 300,             // ms — minimum delay before accepting restart input
  }),

});
```

**Design rationale:** grouping constants by concern makes it easy to tune gameplay feel. A developer adjusting difficulty changes only `pipes.speed`, `pipes.gapHeight`, or `physics.gravity`. No other file changes.

---

## Components and Interfaces

### game.js — Game Loop and State Machine

`game.js` owns the `requestAnimationFrame` loop and the current `GameState`. It calls each module's `update()` and delegates drawing to `renderer.js`.

```js
// Exported state enum
export const GameState = {
  MAIN_MENU: 'MAIN_MENU',
  ACTIVE:    'ACTIVE',
  PAUSED:    'PAUSED',
  GAME_OVER: 'GAME_OVER',
};
```

Loop signature:
```js
function gameLoop(timestamp) {
  const dt = timestamp - lastTimestamp;   // delta in ms (informational)
  update(timestamp);                       // physics, AI, scoring
  renderer.drawFrame(state, snapshot);     // all rendering
  requestAnimationFrame(gameLoop);
}
```

The game loop runs at whatever rate the browser grants (typically 60 fps). Physics constants are expressed in **pixels per frame** and are calibrated for 60 fps. The lerp on rendered position keeps motion smooth if frames are occasionally skipped.

### player.js — Kiro Physics State

```js
// player.js public interface
export function createPlayer(canvasWidth, canvasHeight) { ... }
// Returns a mutable player object:
// { x, y, prevY, renderY, velocityY, alive }

export function applyFlap(player) { ... }
// Sets player.velocityY = CONFIG.physics.flapVelocity

export function stepPhysics(player) { ... }
// 1. player.velocityY += CONFIG.physics.gravity
// 2. player.velocityY = min(player.velocityY, CONFIG.physics.terminalVelocity)
// 3. player.prevY = player.y
// 4. player.y += player.velocityY

export function stepRender(player) { ... }
// player.renderY = lerp(player.prevY, player.y, CONFIG.physics.lerpFactor)

export function getHitbox(player) { ... }
// Returns { x, y, w, h } inset by CONFIG.player.hitboxInset on each edge

export function getSpriteAngle(player) { ... }
// Maps velocityY linearly from tiltUp (at v=0) to tiltDown (at v=terminalVelocity)
```

### pipes.js — Pipe Pool

```js
// pipes.js public interface
export function createPipePool() { ... }
// Returns { pipes: [], distanceSinceLastSpawn: 0 }

export function stepPipes(pool, canvasWidth, canvasHeight) { ... }
// 1. Increment distanceSinceLastSpawn by CONFIG.pipes.speed
// 2. If distanceSinceLastSpawn >= CONFIG.pipes.spawnInterval → spawnPipe(pool, canvasWidth, canvasHeight)
// 3. Move all pipes left by CONFIG.pipes.speed
// 4. Remove pipes whose rightEdge <= 0

export function spawnPipe(pool, canvasWidth, canvasHeight) { ... }
// Randomises gap centre within [gapMinMargin + gapHeight/2, canvasHeight - gapMinMargin - gapHeight/2]
// Pushes { x: canvasWidth, gapCentreY, scored: false } onto pool.pipes

export function checkScoring(pool, playerX) { ... }
// Returns count of pipes whose right edge just crossed playerX this frame (0 or 1 typically)

export function getCollisionRects(pool) { ... }
// Returns array of { x, y, w, h } for every pipe rectangle (top + bottom per pair)
```

### renderer.js — All Draw Calls

`renderer.js` is a pure function module. It receives the canvas context and a snapshot of game state, then draws everything in the correct order. It never mutates state.

```js
export function drawFrame(ctx, snapshot) {
  // 1. Background fill
  // 2. Far cloud layer
  // 3. Near cloud layer
  // 4. Pipes
  // 5. Kiro sprite (rotated)
  // 6. Particles
  // 7. Score / UI overlay
  // 8. Screen shake offset (applied as ctx.translate before all draws, restored after)
  // 9. State-specific overlays (Main Menu, Paused, Game Over)
}
```

Screen shake is implemented by wrapping all draws in `ctx.save()` / `ctx.translate(shakeX, shakeY)` / `ctx.restore()`.

### audio.js — HTMLAudioElement Manager

Uses `HTMLAudioElement` for simplicity and maximum browser compatibility.

```js
export function createAudioManager() { ... }
// Loads jump.wav and game_over.wav at startup
// Returns { playFlap(), playGameOver(), pauseMusic(), resumeMusic() }
```

Each sound file is preloaded via `new Audio(src)`. Errors during load are caught and logged; subsequent play calls on failed elements are no-ops, satisfying the "silent fallback" requirement.

Flap sound restart: `audio.currentTime = 0; audio.play()` — this restarts even if already playing.

### particles.js — Particle Trail and Score Pop

```js
// Particle object shape
// { x, y, vx, vy, opacity, born, duration, type: 'trail' | 'scorePop' }

export function createParticleSystem() { ... }
export function emitTrail(system, x, y, velocityY) { ... }
export function emitScorePop(system, x, y) { ... }
export function stepParticles(system, now) { ... }
// Updates positions and opacity, removes expired particles

export function getParticles(system) { ... }
// Returns current particle array for renderer
```

### input.js — Event Normalisation

```js
export function createInputHandler(canvas) { ... }
// Attaches keydown (Space, Escape, P) and pointerdown listeners
// Returns { consumeFlap(), consumePause(), consumeRestart() }
// Uses a flag-based queue so inputs survive across frames without double-firing
```

### storage.js — High Score Persistence

```js
export function loadHighScore() { ... }
// Returns parseInt(localStorage.getItem('flappyKiroHighScore')) || 0
// Wrapped in try/catch; returns 0 if localStorage is unavailable

export function saveHighScore(score) { ... }
// Wrapped in try/catch; silently ignores errors
```

---

## Data Models

### Player Object
```js
{
  x: number,          // fixed horizontal position
  y: number,          // physics position (updated each frame)
  prevY: number,      // position from previous frame (for lerp)
  renderY: number,    // interpolated position used for drawing
  velocityY: number,  // current vertical velocity (positive = down)
  alive: boolean,
}
```

### Pipe Object
```js
{
  x: number,          // left edge of pipe pair
  gapCentreY: number, // vertical centre of the gap
  scored: boolean,    // true once Kiro has passed this pipe
}
```

Derived at render/collision time:
- Top pipe rect: `{ x, y: 0, w: CONFIG.pipes.width, h: gapCentreY - CONFIG.pipes.gapHeight/2 }`
- Bottom pipe rect: `{ x, y: gapCentreY + CONFIG.pipes.gapHeight/2, w: CONFIG.pipes.width, h: canvas.height - (gapCentreY + CONFIG.pipes.gapHeight/2) }`

### Cloud Object
```js
{
  x: number,
  y: number,
  opacity: number,  // fixed per cloud, within layer's opacityMin–opacityMax
  layer: number,    // 0 = far, 1 = near
}
```

### Particle Object
```js
{
  x: number,
  y: number,
  vx: number,
  vy: number,
  opacity: number,
  born: number,       // timestamp ms
  duration: number,   // ms to live
  type: 'trail' | 'scorePop',
  label?: string,     // '+1' for scorePop
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Physics step advances position by velocity

*For any* player with physics-valid state (y within canvas bounds, velocityY within [−20, terminalVelocity]), after one call to `stepPhysics`, the new y position equals the previous y plus the previous velocityY (before gravity is applied), and the new velocityY equals the previous velocityY plus gravity, clamped to terminalVelocity.

**Validates: Requirements 2.3, 2.4**

### Property 2: Terminal velocity clamps downward speed

*For any* velocityY at or above `CONFIG.physics.terminalVelocity`, after one call to `stepPhysics`, the resulting velocityY is less than or equal to `CONFIG.physics.terminalVelocity`.

**Validates: Requirements 2.5**

### Property 3: Lerp rendered position stays between previous and target

*For any* previous position `prevY` and physics position `y`, the result of `lerp(prevY, y, 0.85)` is always strictly between `prevY` and `y` (exclusive) when they differ, and equals `y` when they are equal.

**Validates: Requirements 2.6**

### Property 4: Gap constraints hold for all spawned pipes

*For any* canvas height and any pipe spawned by `spawnPipe`, the top of the gap (gapCentreY − gapHeight/2) is at least `CONFIG.pipes.gapMinMargin` pixels from the top of the canvas, and the bottom of the gap (gapCentreY + gapHeight/2) is at least `CONFIG.pipes.gapMinMargin` pixels from the bottom of the canvas. Furthermore, the gap height equals exactly `CONFIG.pipes.gapHeight` (150px) for all spawned pipes.

**Validates: Requirements 3.3, 3.6**

### Property 5: Pipe scrolling moves pipes left by speed each frame

*For any* pipe at horizontal position x, after one call to `stepPipes`, that pipe's position is x − `CONFIG.pipes.speed`, so long as the pipe's right edge remains > 0.

**Validates: Requirements 3.1**

### Property 6: Collision detection matches hitbox overlap

*For any* player position (x, y) and any pipe rectangle (px, py, pw, ph), the result of the collision check equals true if and only if the player's inset hitbox (computed by `getHitbox`) overlaps the pipe rectangle by at least 1 pixel in both axes simultaneously. This must hold for all position combinations, including boundary cases.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 7: High score is always max(currentScore, storedHighScore)

*For any* current score `s` and any stored high score `h` (both non-negative integers), after a game-over event, the value written to storage equals `max(s, h)`. In particular: if `s > h`, the stored value increases; if `s <= h`, the stored value is unchanged.

**Validates: Requirements 5.3, 5.4**

### Property 8: Score increments exactly once per pipe crossing

*For any* starting score value and any pipe transition where Kiro's x-coordinate crosses the right edge of a pipe's bounding box, the score increments by exactly 1, and the pipe's `scored` flag is set to `true` so that the same pipe cannot increment the score again.

**Validates: Requirements 5.1**

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| `assets/jump.wav` fails to load | `audio.playFlap()` becomes a no-op; game continues |
| `assets/game_over.wav` fails to load | `audio.playGameOver()` becomes a no-op; game continues |
| `localStorage` unavailable | `loadHighScore()` returns 0; `saveHighScore()` silently ignores |
| `window.innerWidth/Height` unavailable | Canvas falls back to 480×640 |
| `requestAnimationFrame` callback delta > 100ms (tab was hidden) | Physics step is still applied once; no multi-step catch-up to avoid tunnelling |

---

## Testing Strategy

### Unit tests (example-based)
- `stepPhysics` with specific known inputs — verify exact output values
- `getHitbox` for a player at (100, 100) with sprite 50×50 — verify inset rect
- `spawnPipe` called 100 times — verify all gaps are within margin bounds (deterministic seed)
- `loadHighScore` / `saveHighScore` with mocked localStorage
- State machine transitions: verify each legal transition fires correct side effects
- `checkScoring` — verify flag prevents double-counting

### Property-based tests
Use a PBT library (e.g. **fast-check** loaded via CDN or `<script type="module">` from npm CDN in test HTML) to generate randomised inputs. Each property test runs a minimum of 100 iterations.

Tag format: `// Feature: flappy-kiro, Property {N}: {property_text}`

**Property 1 test:** Generate random `(y, velocityY)` pairs within physics-valid ranges. Assert `stepPhysics` output matches formula.

**Property 2 test:** Generate `velocityY` values ≥ `CONFIG.physics.terminalVelocity`. Assert output `velocityY` ≤ terminal velocity.

**Property 3 test:** Generate random `(prevY, y)` pairs. Assert lerp result is in `[min(prevY, y), max(prevY, y)]`.

**Property 4 test:** Generate random canvas heights from 300–1200px. Assert all spawned pipes satisfy margin and gap-height constraints.

**Property 5 test:** Generate random pipe x positions > `CONFIG.pipes.width`. Assert position after one step equals x − speed.

**Property 6 test:** Generate random player positions and pipe rectangles across the full canvas area. Assert collision result equals manual rectangle overlap check. Test boundary cases (touching but not overlapping = false).

**Property 7 test:** Generate random `(score, highScore)` integer pairs ≥ 0. Assert stored result equals `Math.max(score, highScore)`.

**Property 8 test:** Generate starting scores and sequences of pipe-crossing events. Assert total score increment equals number of distinct pipes crossed.

### Integration tests
- Full game loop tick: start in ACTIVE state, apply flap, step 60 frames, verify position trajectory
- Pipe collision triggers GAME_OVER within one frame
- Score and high score update correctly on game restart
