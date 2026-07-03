# Known Limitations — v1.0.0-RC1

## Critical

- None

## High

- **WebSocket reconnection race**: If the server restarts while a game is in progress, the client reconnects but does not automatically restore the game state from the session — it re-subscribes to the room. The server re-sends current state via `ROOM_STATE` on `JOIN_ROOM`. This is correct for the protocol but may cause a brief flicker if the server lost its in-memory session during restart (no persistent game state store).

## Medium

- **Chat messages lost on reconnect**: Chat history is stored in-memory only (chat-storage.ts). Server restart or reconnect clears all history. Not persistent. Acceptable for an MVP.
- **No server-side pagination for leaderboard**: Leaderboard returns all players sorted by rating. Could become slow at >10K users. Acceptable for initial launch.
- **No email/password reset flow**: Guest login requires no password. Full email auth registration exists but no "forgot password" flow. Password reset must be done manually via DB.
- **No file size validation on avatar upload**: Avatar upload accepts any file type up to 5 MB (nginx/Cloudflare limit). No image dimension validation.

## Low

- **Bar click area on mobile**: The bar (center divider) does not have a dedicated click target for returning checkers to play. Players must drag or use the legal move dots. This is a deliberate UX choice for the initial release.
- **`reduced-motion` media query**: Not implemented. Animations are minimal and non-disruptive. Deferred to post-MVP.
- **Dice touch target**: On very small screens (<360px), dice tap targets may be under 44×44px. Dice are functional but slightly undersized for thumb taps.
- **Safari `focus-visible`**: Safari 15.x-16.x do not fully support `:focus-visible`. A polyfill or `focus-ring` class fallback may be needed. Acceptable because the game is primarily pointer/touch-interactive.
- **Browser notifications**: No push notifications outside the app tab. Users must keep the lobby tab open to receive game invitations.
- **ESLint warnings**: 92 pre-existing warnings in the web app, all `@typescript-eslint/no-explicit-any` on library callback types. No runtime impact.
- **Game server is single-process**: The game server runs as a single Node.js process. Horizontal scaling requires session affinity (sticky WebSocket connections) or a shared pub/sub backend.
- **No automated visual regression tests**: Layout tests cover calculation logic but not pixel-perfect rendering. Manual QA covers Safari, Chrome, Firefox, Edge, Brave, Samsung Internet.
