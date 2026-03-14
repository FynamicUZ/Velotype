# Velotype Foundation Server Setup

The goal is to set up a Node.js server with Socket.io that handles authoritative matchmaking and initializes match states, including the "Pre-Match Fetching" logic that pulls words from the PostgreSQL database for the match based on player complexity.

## User Review Required

Please review the proposed server directory structure and architecture below. Once approved, I will initialize the project, install dependencies, and write the core files.

## Proposed Changes

### Configuration
#### [NEW] `package.json`
- Initialize Node.js project.
- Add dependencies: `socket.io` (for WebSocket connections), `pg` (for PostgreSQL), `dotenv` (for environment variables).

### Database Integration
#### [NEW] `.env`
- Postgres connection string placeholder.
#### [NEW] `src/db.js`
- Set up PostgreSQL connection pool using `pg`.
- Function to fetch random words matching a given complexity tier/level for pre-match setup.

### Server Infrastructure
#### [NEW] `server.js`
- Entry point for the application running on port 3000.
- Initialize HTTP server and Socket.io instance.
- Handle base socket connection, disconnection, and route players to the Matchmaker.

### Matchmaking & Game Logic
#### [NEW] `src/Matchmaker.js`
- Manages an in-memory queue of players looking for a match.
- Periodically evaluates the queue to pair players based on reasonable ELO margins.
- Upon a successful match, it initializes a new `Match` instance.

#### [NEW] `src/Match.js`
- Represents a temporary match state between paired players.
- Handles the 3-second pre-match countdown.
- Calls `src/db.js` to run the pre-match fetching logic (fetching a small array of ~50 random words) and attaches it to the Match instance.
- Orchestrates game state broadcasts to the client (for 0ms client-side perceived lag vs authoritative server validation).

# Velotype Phase 5 - Training & UI Refinements

This phase focuses on improving the player's visual feedback during typing and enhancing the Training Mode experience.

## Proposed Changes

### UI & Styling
- **[MODIFY] public/style.css**:
    - Update `.correct` to use `var(--neon-green)`.
    - Update `.error` and `.error-char` to use `var(--neon-red)`.
    - Harmonize typing highlight styles across Arena and Super Attacks.
    - Add styles for the "Quit Training" button.

### Typing Engine & UI Logic
- **[MODIFY] public/js/ui.js**:
    - Update `displayTargetWord` to use green/red/cyan classes.
    - Update `updateHp` to handle "Infinity" display for training dummies.
    - Add `showQuitButton(show)` to toggle the visibility of the quit button.
    - Handle the "Quit" button binding in `bindHubEvents`.

### Training Mode
- **[MODIFY] public/index.html**:
    - Add a "Quit Training" button to the `arena-screen`.
- **[MODIFY] public/js/training.js**:
    - Use `Infinity` for the Practice Dummy's health.
    - Bind the "Quit" button to stop training and return to the hub.

## Verification Plan

### Manual Verification
- **Word Highlighting**: Start a match (Ranked or Training) and verify that correct letters are green and typos are red.
- **Training Dummy HP**: Verify that the dummy's HP displays as "∞" and the bar remains full or behaves reasonably.
- **Quit Button**: Start training, then click the "Quit" button to ensure return to the Hub without errors.
