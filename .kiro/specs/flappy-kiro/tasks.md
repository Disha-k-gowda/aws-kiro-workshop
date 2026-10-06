# Implementation Plan: Flappy Kiro

## Overview

Implement Flappy Kiro as a pure browser game using HTML, CSS, and vanilla JavaScript ES modules. The game runs on a single `<canvas>` element driven by `requestAnimationFrame`. Implementation follows the module structure defined in the design: `config.js`, `storage.js`, `input.js`, `audio.js`, `player.js`, `pipes.js`, `particles.js`, `renderer.js`, and `game.js`, wired together by `index.html`.

## Tasks

- [ ] 1. Project scaffold and configuration module
  - [ ] 1.1 Create `index.html` entry point
    - Create `index.html` at the project root with a full-viewport `<canvas id="game-canvas">` element
    - Add CSS to remove margin/padding and set `body` and `canvas` to 100vw × 100vh with `overflow: hidden`
    - Add `<script type="module" src="game.js"></script>` as the only script tag
    - _Requirements: 1.1, 1.11_

  - [ ] 1.2 Create `config.js` with the complete `CONFIG` object
    - Export a single `Object.freeze`'d `CONFIG` with sub-objects: `physics`, `pipes`, `player`, `display`, `clouds` (array), and `fx`
    - Include all values from the design: `gravity: 0.5`, `flapVelocity: -8`, `terminalVelocity: 10`, `lerpFactor: 0.85`, `pipes.speed: 3`, `pipes.gapHeight: 150`, `pipes.gapMinMargin: 60`, `shakeAmplitude: 8`, `shakeDuration: 400`, `invincibilityFrames: 200`, `restartDelay: 300`, and all others specified in the design
    - Freeze nested objects and the clouds array entries
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

  - [ ]* 1.3 Write unit tests for `config.js`
    - Verify `CONFIG` is frozen and all sub-objects are frozen
    - Verify all required keys are present with correct default values matching Requirements 2, 3, 4, and 7
    - _Requirements: 9.5_

- [ ] 2. Storage and input modules
  - [ ] 2.1 Create `storage.js` for high score persistence
    - Implement `loadHighScore()`: reads `localStorage.getItem('flappyKiroHighScore')`, parses as integer, returns 0 on missing or unavailable `localStorage` (wrapped in `try/catch`)
    - Implement `saveHighScore(score)`: writes to `localStorage`, silently ignores errors via `try/catch`
    - _Requirements: 5.5, 5.6, 6.6, 6.7, 6.8_

  - [ ]* 2.2 Write unit tests for `storage.js`
    - Test `loadHighScore` with mocked `localStorage` returning a valid value, a non-numeric value, and throwing an error
    - Test `saveHighScore` with a working `localStorage` and one that throws
    - _Requirements: 5.5, 5.6_

  - [ ] 2.3 Create `input.js` for keyboard and pointer event normalisation
    - Implement `createInputHandler(canvas)` that attaches `keydown` (Space, Escape, P) and `pointerdown` listeners on the canvas
    - Use flag-based queues so each input is consumed exactly once: `consumeFlap()`, `consumePause()`, `consumeRestart()`
    - _Requirements: 2.1, 2.2, 6.3, 6.4_

  - [ ]* 2.4 Write unit tests for `input.js`
    - Dispatch synthetic `keydown` and `pointerdown` events; verify `consumeFlap` returns true once then false on a second call without new events
    - Verify Escape and P both trigger `consumePause`
    - _Requirements: 2.1, 2.2, 6.3_

- [ ] 3. Player physics module
  - [ ] 3.1 Create `player.js` with physics state and update functions
    - Implement `createPlayer(canvasWidth, canvasHeight)`: positions Kiro at `CONFIG.player.startXPercent * canvasWidth`, vertically centred; returns `{ x, y, prevY, renderY, velocityY, alive }`
    - Implement `applyFlap(player)`: sets `player.velocityY = CONFIG.physics.flapVelocity`
    - Implement `stepPhysics(player)`: applies gravity, clamps to `terminalVelocity`, advances `y` by `velocityY`, preserves `prevY`
    - Implement `stepRender(player)`: sets `renderY = lerp(prevY, y, CONFIG.physics.lerpFactor)`
    - Implement `getHitbox(player)`: returns `{ x, y, w, h }` inset by `CONFIG.player.hitboxInset` on each edge relative to the sprite rect centred on `(player.x, player.renderY)`
    - Implement `getSpriteAngle(player)`: maps `velocityY` linearly from `CONFIG.player.tiltUp` (at v=0) to `CONFIG.player.tiltDown` (at terminal velocity)
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 4.1, 8.4, 8.5_

  - [ ]* 3.2 Write property test for `stepPhysics` — Property 1: Physics step advances position by velocity
    - **Property 1: Physics step advances position by velocity**
    - Generate random `(y, velocityY)` pairs within physics-valid ranges using fast-check
    - Assert `newY === oldY + oldVelocityY` and `newVelocityY === clamp(oldVelocityY + gravity, terminalVelocity)`
    - **Validates: Requirements 2.3, 2.4**

  - [ ]* 3.3 Write property test for `stepPhysics` — Property 2: Terminal velocity clamps downward speed
    - **Property 2: Terminal velocity clamps downward speed**
    - Generate `velocityY` values ≥ `CONFIG.physics.terminalVelocity`
    - Assert output `velocityY ≤ CONFIG.physics.terminalVelocity` after `stepPhysics`
    - **Validates: Requirements 2.5**

  - [ ]* 3.4 Write property test for `stepRender` — Property 3: Lerp rendered position stays between previous and target
    - **Property 3: Lerp rendered position stays between previous and target**
    - Generate random `(prevY, y)` pairs
    - Assert `renderY` is in `[min(prevY, y), max(prevY, y)]` when they differ, and equals `y` when equal
    - **Validates: Requirements 2.6**

  - [ ]* 3.5 Write unit tests for `getHitbox` and `getSpriteAngle`
    - Test `getHitbox` for a player at a known position: verify inset rect dimensions and position
    - Test `getSpriteAngle` at `velocityY = 0` (expect `tiltUp`) and at `velocityY = terminalVelocity` (expect `tiltDown`), and at a midpoint value
    - _Requirements: 4.1, 8.5_

- [ ] 4. Pipe pool module
  - [ ] 4.1 Create `pipes.js` with pipe pool management
    - Implement `createPipePool()`: returns `{ pipes: [], distanceSinceLastSpawn: 0 }`
    - Implement `spawnPipe(pool, canvasWidth, canvasHeight)`: randomises `gapCentreY` within `[gapMinMargin + gapHeight/2, canvasHeight − gapMinMargin − gapHeight/2]`; pushes `{ x: canvasWidth, gapCentreY, scored: false }` onto `pool.pipes`
    - Implement `stepPipes(pool, canvasWidth, canvasHeight)`: increments `distanceSinceLastSpawn` by `CONFIG.pipes.speed`; spawns when threshold reached; moves all pipes left; removes pipes whose right edge ≤ 0
    - Implement `checkScoring(pool, playerX)`: returns count of pipes whose right edge just crossed `playerX` this frame and sets their `scored` flag to `true`
    - Implement `getCollisionRects(pool)`: returns array of top and bottom pipe rects derived from each pipe's `gapCentreY`
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 5.1_

  - [ ]* 4.2 Write property test for `spawnPipe` — Property 4: Gap constraints hold for all spawned pipes
    - **Property 4: Gap constraints hold for all spawned pipes**
    - Generate random canvas heights from 300–1200px using fast-check
    - For each spawned pipe assert `gapCentreY − gapHeight/2 >= gapMinMargin` and `gapCentreY + gapHeight/2 <= canvasHeight − gapMinMargin`; assert gap height equals exactly `CONFIG.pipes.gapHeight`
    - **Validates: Requirements 3.3, 3.6**

  - [ ]* 4.3 Write property test for `stepPipes` — Property 5: Pipe scrolling moves pipes left by speed each frame
    - **Property 5: Pipe scrolling moves pipes left by speed each frame**
    - Seed a pool with a pipe at random x > `CONFIG.pipes.width`; call `stepPipes` once
    - Assert the pipe's new x equals the original x minus `CONFIG.pipes.speed`
    - **Validates: Requirements 3.1**

  - [ ]* 4.4 Write unit tests for `checkScoring` and `getCollisionRects`
    - Test `checkScoring` returns 1 exactly once when Kiro crosses a pipe's right edge, and 0 on subsequent calls for the same pipe
    - Test `getCollisionRects` returns two rects per pipe with correct dimensions derived from `gapCentreY`
    - _Requirements: 3.5, 5.1_

- [ ] 5. Collision detection
  - [ ] 5.1 Implement collision detection in `player.js` (or a dedicated `collision.js` helper imported by `game.js`)
    - Implement `checkCollision(player, pipeRects, canvasHeight)`: checks `getHitbox` against every pipe rect (AABB overlap ≥ 1px), ground boundary, and ceiling boundary; returns `true` if any collision detected
    - Use the hitbox inset defined by `CONFIG.player.hitboxInset` for all checks
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 5.2 Write property test for collision detection — Property 6: Collision detection matches hitbox overlap
    - **Property 6: Collision detection matches hitbox overlap**
    - Generate random player positions and pipe rectangles covering the full canvas area using fast-check
    - Assert collision result equals a manual AABB overlap check on the inset hitbox; include boundary cases (touching = no collision)
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [ ] 6. Audio manager module
  - [ ] 6.1 Create `audio.js` with HTMLAudioElement manager
    - Implement `createAudioManager()`: preloads `assets/jump.wav` and `assets/game_over.wav` via `new Audio(src)`; wraps load errors in `onerror` handlers that mark the element as failed
    - Implement `playFlap()`: sets `currentTime = 0` and calls `play()` on the jump audio element; no-op if element failed to load
    - Implement `playGameOver()`: sets `currentTime = 0` and calls `play()` on the game-over audio element; no-op if failed
    - Implement `pauseMusic()` and `resumeMusic()`: pause/resume the background music element (procedurally generated or looping ambient audio); no-op if unavailable
    - Implement `playScoreSound()`: plays a distinct scoring sound (separate Web Audio API tone or dedicated asset); no-op if unavailable
    - Wrap all `play()` calls in `.catch(() => {})` to silence `NotAllowedError` on autoplay restrictions
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [ ] 7. Particle system module
  - [ ] 7.1 Create `particles.js` with trail and score pop effects
    - Implement `createParticleSystem()`: returns `{ particles: [] }`
    - Implement `emitTrail(system, x, y, velocityY, now)`: emits particles at rate `CONFIG.fx.particlesPerSecond`; each particle has velocity opposite to Kiro's current velocity vector, starting opacity `CONFIG.fx.particleStartOpacity`, duration in `[400, 600]` ms
    - Implement `emitScorePop(system, x, y, now)`: emits a single `type: 'scorePop'` particle with `label: '+1'`, floating upward `CONFIG.fx.scorePopDistance` px over `CONFIG.fx.scorePopDuration` ms
    - Implement `stepParticles(system, now)`: advances positions by velocity, updates opacity via linear fade, removes expired particles
    - Implement `getParticles(system)`: returns the current particle array
    - _Requirements: 7.9, 7.10_

- [ ] 8. Renderer module
  - [ ] 8.1 Create `renderer.js` with all canvas draw calls
    - Implement `drawFrame(ctx, snapshot)` that draws in this order: background fill (`CONFIG.display.backgroundColor`), far cloud layer, near cloud layer, pipes (green `CONFIG.display.pipeColor` with sketchy rect style), Kiro sprite (rotated via `getSpriteAngle`, scaled uniformly to `CONFIG.player.spriteWidth × spriteHeight`), particle trail dots and score pop labels, score/UI overlay, state-specific overlays (Main Menu, Paused, Game Over)
    - Implement screen shake: wrap all draws in `ctx.save()` / `ctx.translate(shakeX, shakeY)` / `ctx.restore()` where shake offsets decay from `±CONFIG.display.shakeAmplitude` to 0 over `CONFIG.display.shakeDuration` ms
    - Render score panel in the bottom 10% of canvas: "Score: [n] | High: [h]" in `CONFIG.display.scoreFontFamily` at `CONFIG.display.scoreFontSize`px
    - Render Main Menu overlay: title "Flappy Kiro", high score, start prompt
    - Render Game Over overlay: "Game Over" message, final score, restart prompt
    - Render Pause overlay: "Paused" message and resume prompt
    - Constrain cloud y positions to upper two-thirds of canvas height
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 3.4, 4.6, 4.9, 4.10, 6.1, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 8.2 Write unit tests for renderer helper functions
    - Test sprite angle calculation integration with renderer (no canvas required — test the angle value passed)
    - Test score panel text format: verify "Score: 0 | High: 0" format for zero values and "Score: 42 | High: 100" for non-zero
    - _Requirements: 1.9, 8.3_

- [ ] 9. Game loop and state machine
  - [ ] 9.1 Create `game.js` with the game loop and state machine
    - Implement `GameState` enum: `MAIN_MENU`, `ACTIVE`, `PAUSED`, `GAME_OVER`
    - Initialise canvas to viewport dimensions with fallback to `CONFIG.display.fallbackWidth × fallbackHeight`
    - Instantiate all modules: `createAudioManager()`, `createInputHandler(canvas)`, `createPlayer()`, `createPipePool()`, `createParticleSystem()`, `loadHighScore()`
    - Implement the `gameLoop(timestamp)` function: compute delta, call `update(timestamp)`, call `renderer.drawFrame(ctx, snapshot)`, schedule next frame via `requestAnimationFrame`
    - Implement `update(timestamp)`: branch on `GameState`; in ACTIVE state call `stepPhysics`, `stepRender`, `stepPipes`, `checkScoring` (increment score, `emitScorePop`, `playScoreSound`), `emitTrail`, `stepParticles`, `checkCollision`; on collision trigger Game Over; handle flap input; handle pause input
    - Implement state transitions: MAIN_MENU → ACTIVE on first flap; ACTIVE → PAUSED on Escape/P; PAUSED → ACTIVE on Escape/P/Space; ACTIVE → GAME_OVER on collision; GAME_OVER → ACTIVE on restart input (after `restartDelay`); reset score, pipes, and player on restart
    - On Game Over: `saveHighScore` if score > highScore, `playGameOver()`, start screen shake timer, stop background music, enforce `invincibilityFrames`
    - On Pause: `pauseMusic()`; on Resume: `resumeMusic()`
    - On Active State start: `resumeMusic()`
    - _Requirements: 1.10, 1.11, 2.7, 2.8, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.6, 7.7, 9.3, 9.4_

  - [ ]* 9.2 Write property test for scoring — Property 7: High score is always max(currentScore, storedHighScore)
    - **Property 7: High score is always max(currentScore, storedHighScore)**
    - Generate random `(score, highScore)` non-negative integer pairs using fast-check
    - Simulate a game-over event and assert the value passed to `saveHighScore` equals `Math.max(score, highScore)`
    - **Validates: Requirements 5.3, 5.4**

  - [ ]* 9.3 Write property test for scoring — Property 8: Score increments exactly once per pipe crossing
    - **Property 8: Score increments exactly once per pipe crossing**
    - Generate sequences of player x positions and pipe states using fast-check
    - Assert total score increment equals the number of distinct pipes crossed (scored flag prevents double-counting)
    - **Validates: Requirements 5.1**

  - [ ]* 9.4 Write integration tests for game loop state transitions
    - Test MAIN_MENU → ACTIVE transition fires within one frame on flap input
    - Test ACTIVE → GAME_OVER triggers within one frame of a collision
    - Test GAME_OVER → ACTIVE respects `restartDelay` (input before delay is ignored, input after delay is accepted)
    - Test score and high score update correctly across a restart cycle
    - _Requirements: 2.8, 4.5, 6.2, 6.5_

- [ ] 10. Checkpoint — core game loop
  - Ensure all tests pass, ask the user if questions arise.
  - At this point the game should be fully playable: canvas renders, Kiro falls and flaps, pipes scroll, collision triggers game over, score persists.

- [ ] 11. Cloud parallax and visual polish
  - [ ] 11.1 Implement cloud initialisation and scrolling in `renderer.js` (or a dedicated `clouds.js` helper)
    - Initialise clouds from `CONFIG.clouds` array: for each layer descriptor create `count` cloud objects with varied x spread across the full canvas width, y constrained to upper two-thirds, and opacity sampled uniformly within `[opacityMin, opacityMax]`
    - In each frame, move each cloud left by its layer speed, wrap to right edge when fully off-screen left
    - Draw each cloud as a semi-transparent white ellipse (or sketchy shape) at its current position and opacity
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ] 11.2 Apply Kiro sprite rotation and uniform scaling in `renderer.js`
    - Use `ctx.save()`, `ctx.translate(player.x, player.renderY)`, `ctx.rotate(angle)`, `ctx.drawImage` centred at (0,0), `ctx.restore()`
    - Scale uniformly to `CONFIG.player.spriteWidth × spriteHeight`; never stretch axes independently
    - _Requirements: 8.4, 8.5_

  - [ ]* 11.3 Write unit tests for cloud wrapping behaviour
    - Test that a cloud at x = −cloudWidth wraps back to canvasWidth
    - Test that cloud y values are always ≤ canvasHeight × 0.667
    - _Requirements: 1.6, 1.7_

- [ ] 12. Checkpoint — visual and audio completeness
  - Ensure all tests pass, ask the user if questions arise.
  - At this point the full game should be visually complete: parallax clouds, rotating Kiro sprite, particle trail, score pop, screen shake, and all audio cues should be working.

- [ ] 13. Final wiring and edge-case hardening
  - [ ] 13.1 Verify `config.js` is the sole source of all numeric constants
    - Audit every other module for inline magic numbers; replace any found with references to the appropriate `CONFIG` property
    - _Requirements: 9.3, 9.4_

  - [ ] 13.2 Verify all audio and `localStorage` error paths are silent
    - Confirm every `Audio.play()` call is guarded with `.catch(() => {})`
    - Confirm `loadHighScore` and `saveHighScore` are wrapped in `try/catch`
    - Confirm failed audio elements are no-ops on subsequent play calls
    - _Requirements: 4.7, 4.8, 5.6, 6.8, 7.8_

  - [ ] 13.3 Verify canvas fallback dimensions and viewport sizing
    - Confirm canvas is sized to `window.innerWidth × window.innerHeight`; if either is falsy, falls back to `CONFIG.display.fallbackWidth × fallbackHeight`
    - _Requirements: 1.1, 1.11_

  - [ ]* 13.4 Write end-to-end integration smoke test
    - Simulate a full session in jsdom or a headless browser: page load → main menu render → flap → 10 frames of ACTIVE state → synthetic collision → game over screen → restart → verify score reset to 0
    - _Requirements: 6.2, 6.5_

- [ ] 14. Final checkpoint — all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use **fast-check** (load via npm CDN or `<script type="module">` in a test HTML file)
- Unit tests can use any lightweight runner (e.g. Vitest or a plain test HTML file)
- All constants must flow from `config.js`; no magic numbers in any other module
- Checkpoints at tasks 10 and 12 provide natural integration milestones before the final polish pass

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1", "2.3"] },
    { "id": 2, "tasks": ["2.2", "2.4", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "3.5", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4", "5.1", "6.1"] },
    { "id": 5, "tasks": ["5.2", "7.1"] },
    { "id": 6, "tasks": ["8.1"] },
    { "id": 7, "tasks": ["8.2", "9.1"] },
    { "id": 8, "tasks": ["9.2", "9.3", "9.4", "11.1", "11.2"] },
    { "id": 9, "tasks": ["11.3", "13.1", "13.2", "13.3"] },
    { "id": 10, "tasks": ["13.4"] }
  ]
}
```
