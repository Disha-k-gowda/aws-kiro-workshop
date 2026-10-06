# Requirements Document

## Introduction

Flappy Kiro is a retro-style endless side-scrolling browser game inspired by Flappy Bird. The player controls Kiro, a ghost character, navigating through a series of pipe obstacles by tapping or clicking to keep Kiro airborne. The game runs entirely in the browser using HTML, CSS, and JavaScript, leveraging existing sprite and audio assets. The visual style is hand-drawn and sketchy, matching the provided UI mockup, with a blue background, green pipes, floating clouds, and a score display at the bottom of the screen.

## Glossary

- **Game**: The Flappy Kiro browser application.
- **Kiro**: The ghost character sprite controlled by the player (`assets/ghosty.png`).
- **Pipe**: A pair of vertically-aligned obstacles (top pipe and bottom pipe) with a gap that Kiro must pass through.
- **Gap**: The vertical opening between the top and bottom pipe through which Kiro must fly.
- **Score**: The count of pipes Kiro has successfully passed through in the current session.
- **High Score**: The highest Score achieved across all sessions, persisted in the browser.
- **Game Loop**: The continuous cycle of updating game state and rendering each animation frame.
- **Gravity**: The constant downward acceleration applied to Kiro each frame.
- **Flap**: The upward velocity impulse applied to Kiro when the player inputs a jump action.
- **Collision**: Contact between Kiro's bounding box and a pipe, the ground, or the ceiling.
- **Game Over**: The state entered when a Collision is detected; stops the Game Loop and plays the game-over sound.
- **Idle State**: The initial state before the first player input, where Kiro hovers in place.
- **Active State**: The state during which the Game Loop runs and pipes scroll.
- **Canvas**: The HTML `<canvas>` element on which all game visuals are rendered.
- **Terminal Velocity**: The maximum downward speed Kiro can fall, beyond which Gravity has no further effect.
- **Momentum Conservation**: The carrying of residual vertical velocity between frames, giving Kiro a smooth arc rather than instant speed changes.
- **Hitbox**: A reduced rectangular region centred on Kiro's sprite used for collision checks, smaller than the visible sprite to allow forgiving near-misses.
- **Invincibility Frames**: A brief period after a collision trigger is processed during which additional collision events are ignored.
- **Screen Shake**: A short camera-offset effect applied to the canvas when a collision occurs.
- **Particle Trail**: A stream of small fading particles emitted from Kiro's position while in Active State.
- **Main Menu**: The initial game screen showing the title, high score, and a prompt to start.
- **Pause State**: A game state in which the Game Loop is suspended and a pause overlay is shown.
- **Background Music**: A looping ambient audio track that plays throughout gameplay.
- **Score Pop**: A brief floating "+1" text animation that appears above the score display when a point is earned.

---

## Requirements

### Requirement 1: Game Initialization and Display

**User Story:** As a player, I want to see the game rendered in my browser with the correct visual style, so that I can immediately recognise and enjoy the Flappy Kiro aesthetic.

#### Acceptance Criteria

1. THE Game SHALL render on an HTML `<canvas>` element sized to match the browser viewport width and height in pixels at the time of page load.
2. THE Game SHALL draw a blue sketchy-style background that fills the entire canvas area (all pixels from coordinate (0,0) to (canvas width, canvas height)) on every frame render.
3. THE Game SHALL render clouds across at least 2 distinct depth layers, where the far layer moves at approximately 0.5 pixels per frame and the near layer moves at approximately 1.5 pixels per frame, producing a parallax perspective effect.
4. THE Game SHALL render clouds in the far layer with an opacity between 0.3 and 0.5, and clouds in the near layer with an opacity between 0.5 and 0.7, so that all clouds appear semi-transparent against the background.
5. THE Game SHALL display a total of at least 3 clouds distributed across all layers, with each cloud's horizontal start position varied so that clouds are spread across the full canvas width.
6. WHILE the Active State or Idle State is active, THE Game SHALL continuously scroll all cloud layers from right to left at their respective layer speeds, wrapping each cloud back to the right edge of the Canvas when it moves fully off the left edge, so that the cloud background loops without gaps.
7. THE Game SHALL constrain all cloud vertical positions to the upper two-thirds of the canvas height (y = 0 to y = canvas height × 0.667).
8. THE Game SHALL render Kiro using the sprite at `assets/ghosty.png` at a horizontal position between 15% and 25% of the canvas width, vertically centred on the canvas.
9. THE Game SHALL display a score panel in the bottom 10% of the canvas height showing the text "Score: [current] | High: [high]" where [current] and [high] are non-negative integers, rendered in a retro monospace font no smaller than 16px.
10. WHEN the page loads, THE Game SHALL enter Idle State and display a prompt text instructing the player to press Space or click/tap to start, centred horizontally and vertically on the canvas.
11. IF the browser viewport dimensions cannot be determined at page load, THEN THE Game SHALL fall back to a canvas size of 480×640 pixels.

---

### Requirement 2: Player Controls and Kiro Physics

**User Story:** As a player, I want Kiro to move with realistic, smooth physics so that the game feels satisfying and skill-based.

#### Acceptance Criteria

1. WHEN the player presses the Space key, THE Game SHALL apply a Flap impulse to Kiro, setting Kiro's vertical velocity to a fixed upward value of -8 pixels per frame.
2. WHEN the player clicks or taps the Canvas, THE Game SHALL apply a Flap impulse to Kiro, setting Kiro's vertical velocity to a fixed upward value of -8 pixels per frame.
3. WHILE the Active State is active, THE Game SHALL apply Gravity to Kiro every frame, incrementing Kiro's downward velocity by 0.5 pixels per frame squared (the gravity constant).
4. WHILE the Active State is active, THE Game SHALL update Kiro's vertical position each frame by adding the current velocity to Kiro's current vertical coordinate, preserving momentum between frames (momentum conservation).
5. THE Game SHALL clamp Kiro's downward velocity to a Terminal Velocity of 10 pixels per frame; gravity increments SHALL have no effect once this limit is reached.
6. THE Game SHALL interpolate Kiro's rendered vertical position using linear interpolation (lerp factor 0.85) between the previous frame position and the physics-calculated position, so that movement appears smooth at any frame rate.
7. WHEN a Flap impulse is applied, THE Game SHALL play the Flap sound from the beginning within 50 milliseconds of the input event.
8. WHEN the player inputs a Flap during Idle State, THE Game SHALL transition to Active State and begin the Game Loop within one frame (≤ 16 milliseconds).

---

### Requirement 3: Pipe Obstacles

**User Story:** As a player, I want a continuous stream of pipe obstacles to navigate, so that the game presents an escalating challenge.

#### Acceptance Criteria

1. WHILE the Active State is active, THE Game SHALL continuously scroll Pipe pairs from the right edge of the Canvas toward the left at a fixed speed of 3 pixels per frame.
2. WHEN a Pipe pair has moved at least 300 pixels from the right edge of the Canvas, THE Game SHALL spawn a new Pipe pair at the right edge of the Canvas.
3. WHEN a new Pipe pair is spawned, THE Game SHALL randomise the vertical centre position of the Gap such that the top of the Gap is no closer than 60 pixels to the top of the Canvas and the bottom of the Gap is no closer than 60 pixels to the bottom of the Canvas.
4. WHILE the Active State is active, THE Game SHALL render each Pipe pair as a top pipe extending downward from the top of the Canvas and a bottom pipe extending upward from the bottom of the Canvas, drawn in the green sketchy style shown in the UI mockup.
5. WHEN a Pipe pair has scrolled fully off the left edge of the Canvas such that its right edge is at x = 0, THE Game SHALL remove that Pipe pair from the game state.
6. THE Gap height SHALL be a fixed value of 150 pixels for all Pipe pairs throughout the game session.

---

### Requirement 4: Collision Detection and Game Over

**User Story:** As a player, I want precise, forgiving collision detection and satisfying feedback when I crash, so that the game feels fair and impactful.

#### Acceptance Criteria

1. THE Game SHALL define Kiro's Hitbox as a rectangle inset 20% from each edge of the sprite's rendered bounding box, so that near-misses with pipes do not trigger Game Over.
2. WHEN Kiro's Hitbox overlaps with any Pipe's bounding box by at least 1 pixel, THE Game SHALL trigger Game Over.
3. WHEN Kiro's Hitbox bottom edge is greater than or equal to the canvas height (ground boundary), THE Game SHALL trigger Game Over.
4. WHEN Kiro's Hitbox top edge is less than or equal to 0 (ceiling boundary), THE Game SHALL trigger Game Over.
5. WHEN Game Over is triggered, THE Game SHALL stop the Game Loop within 1 frame (≤ 16 ms at 60 fps) and not process further physics, pipe movement, or scoring updates.
6. WHEN Game Over is triggered, THE Game SHALL apply a Screen Shake effect by offsetting the canvas render origin by up to ±8 pixels in both axes, decaying to zero over 400 milliseconds.
7. WHEN Game Over is triggered, THE Game SHALL play the audio file at `assets/game_over.wav` from the beginning, if the audio file loads successfully.
8. IF the audio file at `assets/game_over.wav` fails to load, THE Game SHALL proceed with Game Over silently without throwing an unhandled error.
9. WHEN Game Over is triggered, THE Game SHALL display a Game Over message and the final Score centred horizontally on the Canvas.
10. WHEN Game Over is triggered, THE Game SHALL display a restart prompt indicating that Space or click/tap will restart.
11. THE Game SHALL enforce Invincibility Frames of 200 milliseconds after Game Over is triggered, during which additional collision events are ignored.

---

### Requirement 5: Scoring

**User Story:** As a player, I want to earn points for each pipe I clear and see my high score persist, so that I have a goal to chase across sessions.

#### Acceptance Criteria

1. WHEN Kiro's horizontal position passes the right edge of a Pipe pair without triggering Game Over, THE Game SHALL increment the Score by 1.
2. WHEN the Score changes, THE Game SHALL update the score display within 100 milliseconds.
3. WHEN Game Over is triggered, IF the current Score exceeds the stored High Score, THEN THE Game SHALL update the High Score to the current Score and persist it to `localStorage` before the Game Over screen is displayed.
4. WHEN Game Over is triggered, IF the current Score does not exceed the stored High Score, THEN THE Game SHALL leave the stored High Score unchanged.
5. WHEN the page loads, THE Game SHALL read the High Score from `localStorage` and display it in the score panel before the first frame is rendered.
6. IF `localStorage` is unavailable or contains no prior High Score entry, THEN THE Game SHALL display a High Score of 0.

---

### Requirement 6: Game State Management

**User Story:** As a player, I want clear game states including a main menu, pause, and game over screen, so that I always know what the game is doing and can control my session.

#### Acceptance Criteria

1. WHEN the page loads, THE Game SHALL display a Main Menu screen showing the game title "Flappy Kiro", the current High Score from `localStorage`, and a prompt to press Space or click/tap to start.
2. WHEN the player starts a new game from the Main Menu or Game Over screen, THE Game SHALL transition to Active State, resetting Score to 0, clearing all Pipes, and returning Kiro to its initial vertical position.
3. WHILE the Active State is active, WHEN the player presses the Escape key or the P key, THE Game SHALL enter Pause State, suspending the Game Loop and displaying a pause overlay with a "Paused" message and a resume prompt.
4. WHILE the Pause State is active, WHEN the player presses Escape, P, or Space, THE Game SHALL resume Active State and continue the Game Loop from the suspended state.
5. WHEN the game transitions from Game Over State back to Main Menu or Active State, THE Game SHALL apply a minimum delay of 300 milliseconds before accepting a restart input to prevent accidental double-presses.
6. THE Game SHALL NOT reset the High Score on game restart or on return to the Main Menu.
7. THE Game SHALL persist the High Score to `localStorage` immediately when a new High Score is set.
8. IF `localStorage` is unavailable, THE Game SHALL display a High Score of 0 and continue without persisting.

---

### Requirement 7: Audio and Visual Feedback

**User Story:** As a player, I want rich audio and visual feedback for every action and event, so that the game feels alive, responsive, and rewarding.

#### Acceptance Criteria

1. THE Game SHALL load `assets/jump.wav` at startup for use as the Flap sound effect.
2. THE Game SHALL load `assets/game_over.wav` at startup for use as the collision/Game Over sound effect.
3. THE Game SHALL load or procedurally generate a looping background music track that plays during Active State and pauses during Pause State and Game Over State.
4. WHEN a Flap impulse is applied, THE Game SHALL play the Flap sound from the beginning, even if it is already playing (by restarting the audio from t=0).
5. WHEN Kiro passes a Pipe pair (score increments), THE Game SHALL play a distinct scoring sound effect (separate from the Flap sound).
6. WHEN Game Over is triggered, THE Game SHALL play `assets/game_over.wav` and stop the background music within the same frame.
7. WHEN the Pause State is entered, THE Game SHALL pause the background music; WHEN the Pause State is exited, THE Game SHALL resume the background music.
8. IF any sound asset fails to load, THE Game SHALL continue operating silently for that sound without throwing an unhandled error.
9. WHILE the Active State is active, THE Game SHALL emit a Particle Trail from Kiro's position: at least 5 small particles per second, each fading from 80% to 0% opacity over 400–600 milliseconds, moving in a direction opposite to Kiro's current velocity vector.
10. WHEN the Score increments, THE Game SHALL display a Score Pop animation: a "+1" text label that starts at the score panel position, floats upward by 30 pixels, and fades from full opacity to 0 over 600 milliseconds.
11. WHEN Game Over is triggered, THE Game SHALL apply the Screen Shake effect as defined in Requirement 4 criterion 6.
12. WHILE the Active State is active, THE Game SHALL display the current Score in real time within 100 milliseconds of a change.

---

### Requirement 8: Visual Style and Retro Aesthetic

**User Story:** As a player, I want the game to look hand-drawn and retro, so that it matches the Flappy Kiro brand identity shown in the mockup.

#### Acceptance Criteria

1. THE Game SHALL render pipes using a green colour (hex #4a7c2f or visually equivalent) in a sketchy style consistent with the reference image at `img/example-ui.png`.
2. THE Game SHALL render the background as a blue (#7ec8d8 or visually equivalent) canvas with a hand-drawn sketch texture or illustration overlaid, matching the aesthetic of the UI mockup.
3. THE Game SHALL render score text using a monospace or pixel-style font with a minimum rendered size of 16px, ensuring legibility at all supported canvas sizes.
4. THE Game SHALL render Kiro using the `assets/ghosty.png` sprite scaled uniformly (preserving the original width-to-height ratio) so that no axis is stretched independently of the other.
5. THE Game SHALL rotate Kiro's sprite based on current vertical velocity: rotating up to +10 degrees when velocity is at or above 0 (rising or level) and rotating down to −25 degrees when velocity is at or above the maximum downward clamp, with linear interpolation between these bounds.
