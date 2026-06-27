# Game Flow

This document describes the complete end-to-end game flow on the Backgammon Pro platform, from the moment a user opens the application to the moment they return to the lobby after a completed match.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Application Start                                            │
│    ↓                                                            │
│ 2. Login / Guest Login                                          │
│    ↓                                                            │
│ 3. Lobby                                                        │
│    ↓                                                            │
│ 4. Room Selection                                               │
│    ↓                                                            │
│ 5. Table Creation ────────────┐                                 │
│                              │                                   │
│                              ▼                                   │
│ 6. Join Table ◄──────────────┘                                 │
│    ↓                                                            │
│ 7. Chat (ongoing through stages 8-13)                           │
│    ↓                                                            │
│ 8. Match Start                                                  │
│    ↓                                                            │
│ 9. Dice Roll ─── tie ──► re-roll                                │
│    ↓ (decided)                                                  │
│ 10. Turn System (repeat until game ends)                        │
│     ├── Roll dice                                               │
│     ├── Evaluate legal moves                                    │
│     │    ├── No legal moves ──► turn passes                     │
│     │    └── Legal moves exist ──► Player moves                 │
│     └── Check win condition                                     │
│           ├── Not met ──► Next player's turn                    │
│           └── Met ──► End of game                               │
│    ↓                                                            │
│ 11. Legal Move Validation (during each turn)                    │
│    ↓                                                            │
│ 12. End of Game                                                 │
│    ↓                                                            │
│ 13. Match Winner ──►  ┌── More games remain ──► Next game      │
│                        └── Match complete ──► Continue          │
│    ↓                                                            │
│ 14. Rating Update                                               │
│    ↓                                                            │
│ 15. Return to Lobby                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Application Start

**Trigger:** User opens the application (web browser, mobile app).

**Actions:**

- Application loads and establishes a connection to the game server
- Client checks for an existing session token in local storage
  - Valid token found → skip to stage 3 (Lobby)
  - No token or expired token → present authentication screen
- Application resources (assets, configurations) are fetched or loaded from cache
- Client registers with the backend for real-time event subscriptions

**Result:** Application is ready. User is presented with either the lobby (authenticated) or the authentication screen (unauthenticated).

**Next Stage:** Login / Guest Login

---

## 2. Login / Guest Login

**Trigger:** User reaches the authentication screen after application start, or after explicitly logging out.

### Option A: Registered User Login

**Actions:**

- User enters email and password
- Credentials are sent to the authentication endpoint
- Server validates credentials against stored password hash
- On success:
  - Server creates a session record with an auth token
  - Server returns the token and user profile data
  - Client stores the token for subsequent requests
- On failure:
  - Server returns an authentication error
  - Client displays the error to the user

### Option B: Guest Login

**Actions:**

- User selects "Play as Guest"
- Client requests a guest session from the server
- Server creates a GuestUser record and a session
- Server returns a guest token and auto-generated display name
- Client stores the token

**Options at this stage:**

- Guest users can register later to preserve their rating and history
- Registered users can switch between accounts (logout → login)

**Result:** User is authenticated and has a valid session token. Player identity (user or guest) is established for the duration of the session.

**Next Stage:** Lobby

---

## 3. Lobby

**Trigger:** Authentication completes successfully.

**Actions:**

- Server sends the lobby state to the client:
  - List of available rooms
  - Current player's profile summary (username, rating, games played)
  - Any pending invitations or active tables the player is part of
- Client renders the lobby interface
- Client subscribes to lobby events (new rooms, room updates, friend activity)
- Server begins tracking the player's online presence

**Result:** Player sees the lobby with available rooms, their profile stats, and any active sessions.

**Next Stage:** Room Selection (player initiates)

---

## 4. Room Selection

**Trigger:** Player selects a room from the lobby listing.

**Actions:**

- Client sends a room join request to the server
- Server validates the player meets the room's requirements:
  - Rating within the room's min/max range (for registered players)
  - Room is active and accepting players
- On validation:
  - Server adds the player to the room's participant set
  - Server sends the room state: list of active tables, current players, recent chat
  - Client transitions to the room view
- On rejection:
  - Server returns the reason (rating too low, room full, etc.)
  - Client displays the rejection and remains in the lobby

**Result:** Player enters a room and sees available tables and other participants.

**Next Stage:** Table Creation or Join Table (player chooses)

---

## 5. Table Creation

**Trigger:** Player creates a new table in the current room.

**Actions:**

- Player configures table settings:
  - Table name (optional)
  - Match length (number of games: 1, 3, 5, or 7)
  - Ranked or unranked
  - Optionally, a minimum opponent rating
- Client sends a create-table request to the server
- Server creates a new Table record with `status = 'open'`
- Server adds the creator as the first participant (TableParticipants, position 1)
- Server broadcasts the new table to all players in the room
- Client transitions to the table view, showing the player seated and waiting for an opponent

**Result:** A new table appears in the room. Its creator is seated and waiting.

**Next Stage:** Join Table (opponent joins)

---

## 6. Join Table

**Trigger:** A player selects an open table to join.

### Scenario A: Joining an existing open table

**Actions:**

- Client sends a join-table request to the server
- Server validates:
  - Table status is `open`
  - Table does not already have two participants
  - Player meets any table-specific requirements (rating, etc.)
- On validation:
  - Server adds the joining player as the second participant (TableParticipants, position 2)
  - Server updates table status to `occupied`
  - Server notifies both participants that the table is ready
  - Both clients transition to the match-ready state

### Scenario B: Opponent joins a table the player created

**Actions:**

- The table creator receives a notification that an opponent has joined
- Both players see the table become ready

**Result:** Two players are seated at the table. The table status is `occupied`.

**Next Stage:** Chat (available) → Match Start

---

## 7. Chat

**Trigger:** Available at any point after entering a room (stage 4) and throughout the match (stages 8-13). This is a parallel activity, not a linear stage.

**Actions:**

- Player types and sends a chat message
- Client sends the message to the server with scope (room or table)
- Server records the message in the ChatMessages table
- Server broadcasts the message to all relevant participants:
  - Room-scoped messages → all players in the room
  - Table-scoped messages → the two players at the table
- Server also generates system messages for game events:
  - "Player1 joined the table"
  - "Player2 rolled 4-2"
  - "Player1 wins the game"
- Client receives new messages and appends them to the chat display

**Message types:**

- `text` — Player-written messages
- `system` — Automatically generated game event notifications
- `roll` — Dice roll announcements
- `move` — Move announcements
- `join` / `leave` — Player presence notifications

**Result:** Communication channel is active between players and room participants.

**Next Stage:** No transition — chat continues alongside all subsequent stages.

---

## 8. Match Start

**Trigger:** Two players are seated at an occupied table and both indicate readiness.

**Actions:**

- Server detects both players are present and the table is `occupied`
- Server creates a Match record linked to the table
- Server assigns players to MatchParticipants (positions 1 and 2)
- Server creates the first Game record with `state = 'not_started'`
- Server assigns player colors for the first game (determined by the opening dice roll)
- Server updates table status to `playing`
- Server notifies both clients that the match is starting
- Both clients transition to the game board view

**Result:** Match is created. First game is initialized. Players see the game board.

**Next Stage:** Dice Roll

---

## 9. Dice Roll

**Trigger:** A new game starts (first game of the match or subsequent game).

### Opening Roll (determines first player)

**Actions:**

- Server prompts both players to roll for the first turn
- Each client sends a roll request
- Server generates dice values for each player (two dice each)
- Server compares the results:
  - Both players roll the same value → tie. Both re-roll.
  - One player rolls higher → that player takes the first turn using their rolled values
- Server announces the result to both players

### Subsequent Game Opening

**Actions:**

- The player who lost the previous game rolls first
- No opening roll-off needed for subsequent games in a multi-game match

**Result:** First player is determined. Opening dice values are known.

**Next Stage:** Turn System (first player's turn)

---

## 10. Turn System

**Trigger:** It is a player's turn to move.

**Actions:**

### Step A: Roll Dice

- The current player rolls the dice (or uses the already-rolled opening values for the very first turn)
- Server generates two random dice values (1-6)
- If doubles are rolled (both dice show the same value), the player gets four moves using that value instead of two
- Server records the dice roll in the current Game record
- Server notifies both players of the roll

### Step B: Evaluate Legal Moves

- Server evaluates all legal moves for the current dice values and board position using the game engine
- Branch:
  - **No legal moves exist** → The turn passes automatically. Proceed to Step D with no moves made.
  - **Legal moves exist** → Player must make moves until all dice are used or no further moves are possible.

### Step C: Player Makes Moves

- Player selects a checker and a destination point
- Client sends the move to the server
- Server validates the move against the game engine's legal move rules:
  - Move is legal → Server applies the move, updates board state
  - Move is illegal → Server rejects the move, client shows feedback
- Player may need to make multiple moves (up to the number of dice)
- Player may use moves in any order (standard backgammon rules)
- After each move, the server re-evaluates remaining legal moves:
  - If dice remain and legal moves exist → Player continues
  - If all dice used or no legal moves remain → Turn ends

### Step D: End Turn

- Server checks win condition (see stage 12)
- If the game continues:
  - Server switches `current_turn` to the other player
  - Server notifies both players of the turn change
  - Proceed to Step A for the next player

**Result:** The player completes their turn. Either the game continues with the next player's turn, or the game ends.

**Next Stage:** Dice Roll (next player's turn) or End of Game (if win condition met)

---

## 11. Legal Move Validation

**Trigger:** A player attempts to move a checker from one point to another.

**Actions:**

- Client sends the proposed move (from point, to point) to the server
- Server receives the move and performs validation against the current board state:

  **Validation rules:**
  1. The source point must contain at least one of the player's checkers
  2. The destination point must be valid for the dice value used
  3. The destination point must not be blocked by the opponent:
     - If opponent has 2 or more checkers on a point, it is blocked
     - If opponent has exactly 1 checker (a blot), the move is allowed (and hits the blot)
  4. If the player has checkers on the bar, they must re-enter before making any other move
  5. If the player can bear off, they may do so only if all checkers are in the home board
  6. When bearing off, the player must use the exact dice value if possible; if not possible for the exact value but possible for a higher value, they must bear off from the highest occupied point (standard backgammon rules)

- Server returns the validation result:
  - **Valid:** Move is applied to the board state. The move is recorded in the Moves table. A `board_snapshot` may be captured.
  - **Invalid:** Server returns a rejection reason. Client highlights the issue to the player.

**Result:** Either the move is accepted and the board updates, or the move is rejected with a reason.

**Next Stage:** Continue Turn System (more moves possible) or End Turn

---

## 12. End of Game

**Trigger:** A player bears off all fifteen checkers.

**Actions:**

- Server detects the win condition during the turn evaluation (after all moves in the turn are complete)
- Server determines the win type:
  - **Normal win:** Opponent has borne off at least one checker (1 point)
  - **Gammon:** Opponent has not borne off any checkers (2 points)
  - **Backgammon:** Opponent has not borne off any checkers and has at least one checker in the winner's home board or on the bar (3 points)
- Server records the game result:
  - Updates Game record: `state = 'finished'`, `winner_player_id`, `win_type`, `win_value`, `finished_at`
  - Updates GameParticipants: marks the winner, records the loser
- Server multiplies the base win value by the doubling cube value (if the cube was in play)
- Server generates a system chat message announcing the result
- Server notifies both clients of the game result
- Both clients display the game result screen

**Alternative end conditions:**

- **Resignation:** A player resigns. The opponent wins. Win type is `resignation`. Win value depends on resignation stage (single game value, gammon value, or backgammon value).
- **Timeout:** A player's time expires. The opponent wins. Win type is `timeout`.
- **Abandonment:** A player disconnects and does not return within the timeout window. Match is marked `abandoned`.

**Result:** Game is finished. Players see the outcome.

**Next Stage:** Match Winner (determine if the match is complete)

---

## 13. Match Winner

**Trigger:** A game ends and the match needs to be evaluated for completion.

**Actions:**

- Server checks the match state:
  - Increments the winner's match score
  - Compares the current score against the match target:
    - **Match not complete:** Current score does not meet the win threshold (e.g., best of 3: no player has 2 wins yet)
      - Server creates the next Game record
      - Server assigns colors (players alternate colors each game in standard backgammon)
      - Server resets the board and dice
      - Server notifies both players to prepare for the next game
      - Players proceed to Dice Roll for the next game
    - **Match complete:** A player has reached the required number of wins
      - Server updates Match record: `status = 'completed'`, `winner_player_id`, `completed_at`
      - Server updates MatchParticipants: marks the match winner
      - Server records the final match score on the Match record
      - Server updates table status to `open` (players may continue) or `closed`
      - Server notifies both players of the match result

**Result:** Either the match continues with another game, or the match is complete with a winner.

**Next Stage:** If match continues → Dice Roll (next game). If match is complete → Rating Update.

---

## 14. Rating Update

**Trigger:** A ranked match is completed.

**Actions:**

- Server retrieves both players' current ratings from the Ratings table
- Server calculates the new ratings using the ELO-based algorithm:
  - Uses the match result (winner/loser) and win type (normal, gammon, backgammon)
  - Win value (affected by doubling cube) may influence the rating adjustment magnitude
  - The rating change is larger when a lower-rated player beats a higher-rated player (and vice versa)
- Server updates both players' Ratings records:
  - Winner: `rating += gain`, `peak_rating = max(peak_rating, new_rating)`, `wins += 1`
  - Loser: `rating -= loss`, `losses += 1`
  - Both: `games_played += 1`, `updated_at = now()`
- Server records rating change metadata (can be stored alongside the match or game result for audit)
- Server notifies both clients of the rating change
- Both clients display the updated ratings

**Notes:**

- Guest players have ratings that persist as long as their guest record exists
- If a guest later converts to a registered user, their rating history transfers
- Unranked matches skip this stage entirely; ratings remain unchanged

**Result:** Both players' ratings are updated. Players see their new ratings.

**Next Stage:** Return to Lobby

---

## 15. Return to Lobby

**Trigger:** The match is complete and both players acknowledge the result (or navigate away).

**Actions:**

- Client presents options:
  - **Play Again:** Players stay at the table and start a new match (go to Match Start, stage 8)
  - **Leave Table:** Player exits the table
  - **Return to Room:** Player goes back to the room view (stage 4)
  - **Return to Lobby:** Player goes back to the lobby (stage 3)
- If a player leaves:
  - Server removes the player from TableParticipants
  - Server updates table status to `open` if one player remains
  - Server notifies the remaining player
  - Server closes the table if both players leave
- Client navigates to the selected destination

**Result:** Player is back in the lobby or room, ready to start a new game.

**Next Stage:** Lobby (stage 3) or Room Selection (stage 4).

---

## Reference: State Transitions

### Table States

```
open ──► occupied ──► playing ──► open
  │                     │
  └──► closed           └──► closed
```

### Match States

```
pending ──► in_progress ──► completed
              │               │
              ├──► cancelled   └──► abandoned (on timeout)
              └──► abandoned
```

### Game States

```
not_started ──► in_progress ──► finished
                  │               │
                  ├──► cancelled   └──► abandoned
                  └──► abandoned
```

### Player Turn Flow

```
Wait ──► Roll Dice ──► Evaluate Moves ──► Make Move(s) ──► Check Win ──► Next Player
  ▲                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
```

---

## Reference: Win Types and Point Values

| Win Type   | Base Points | Condition                                                                                       |
| ---------- | ----------- | ----------------------------------------------------------------------------------------------- |
| Normal     | 1           | Opponent has borne off at least one checker                                                     |
| Gammon     | 2           | Opponent has borne off zero checkers                                                            |
| Backgammon | 3           | Opponent has borne off zero checkers and has a checker in the winner's home board or on the bar |

Points are multiplied by the current doubling cube value when applicable.
