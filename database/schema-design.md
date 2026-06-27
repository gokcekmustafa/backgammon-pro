# Database Schema Design

## Overview

This document defines the database schema for the Backgammon Pro platform. The design supports registered users, anonymous guest play, real-time matches, ranked games, and in-game chat.

## Entity-Relationship Summary

```
Users ──── Profiles
  │
  ├──< GuestUsers (conversion tracking)
  ├──< Ratings
  ├──< Sessions
  │
  ├──< TableParticipants (as seated players)
  ├──< MatchParticipants (as match competitors)
  ├──< GameParticipants (as game players)
  │
  └──< ChatMessages (as sender)

GuestUsers ──< Sessions
  ├──< TableParticipants (as seated players)
  ├──< MatchParticipants (as match competitors)
  ├──< GameParticipants (as game players)
  └──< ChatMessages (as sender)

Rooms ──< Tables
  │
  └──< ChatMessages

Tables ──< Matches
  ├──< TableParticipants
  └──< ChatMessages

Matches ──< Games
  └──< MatchParticipants

Games ──< Moves
  └──< GameParticipants
```

---

## Table: `Users`

**Purpose:** Registered user accounts with authentication credentials. Every authenticated player is represented here.

### Fields

| Column              | Type           | Constraints                     | Description              |
| ------------------- | -------------- | ------------------------------- | ------------------------ |
| `id`                | `uuid`         | PK, default `gen_random_uuid()` | Primary identifier       |
| `email`             | `varchar(255)` | NOT NULL, UNIQUE                | Login email              |
| `password_hash`     | `varchar(255)` | NOT NULL                        | bcrypt hash of password  |
| `username`          | `varchar(50)`  | NOT NULL, UNIQUE                | Public username          |
| `display_name`      | `varchar(100)` | NOT NULL                        | Display name shown in UI |
| `is_active`         | `boolean`      | NOT NULL, default `true`        | Soft delete / lock flag  |
| `email_verified_at` | `timestamptz`  | nullable                        | When email was confirmed |
| `last_login_at`     | `timestamptz`  | nullable                        | Last successful login    |
| `created_at`        | `timestamptz`  | NOT NULL, default `now()`       | Account creation time    |
| `updated_at`        | `timestamptz`  | NOT NULL, default `now()`       | Last row update          |

### Primary Key

- `id` — UUID primary key

### Foreign Keys

None.

### Indexes

| Index                  | Columns      | Unique | Purpose                  |
| ---------------------- | ------------ | ------ | ------------------------ |
| `users_email_idx`      | `email`      | Yes    | Login lookup             |
| `users_username_idx`   | `username`   | Yes    | Profile URL, @mentions   |
| `users_created_at_idx` | `created_at` | No     | Admin sorting, metrics   |
| `users_is_active_idx`  | `is_active`  | No     | Filter inactive accounts |

---

## Table: `GuestUsers`

**Purpose:** Anonymous players who use the platform without registering. Guests can later convert to registered users, preserving their game history and rating.

### Fields

| Column              | Type          | Constraints                     | Description                               |
| ------------------- | ------------- | ------------------------------- | ----------------------------------------- |
| `id`                | `uuid`        | PK, default `gen_random_uuid()` | Primary identifier                        |
| `display_name`      | `varchar(50)` | NOT NULL                        | Auto-generated guest name                 |
| `converted_user_id` | `uuid`        | nullable, FK → `Users(id)`      | Links to registered account on conversion |
| `last_seen_at`      | `timestamptz` | NOT NULL, default `now()`       | Last activity timestamp                   |
| `created_at`        | `timestamptz` | NOT NULL, default `now()`       | Guest record creation                     |

### Primary Key

- `id` — UUID primary key

### Foreign Keys

| Column              | References  | Constraint                                                   |
| ------------------- | ----------- | ------------------------------------------------------------ |
| `converted_user_id` | `Users(id)` | `ON DELETE SET NULL` — retain guest history after conversion |

### Indexes

| Index                        | Columns             | Unique | Purpose                               |
| ---------------------------- | ------------------- | ------ | ------------------------------------- |
| `guest_users_converted_idx`  | `converted_user_id` | No     | Find unconverted guests, convert link |
| `guest_users_last_seen_idx`  | `last_seen_at`      | No     | Cleanup stale guest records           |
| `guest_users_created_at_idx` | `created_at`        | No     | Metrics, guest lifecycle              |

---

## Table: `Profiles`

**Purpose:** Extended display and preference data for registered users. Kept separate from `Users` to keep authentication data lean and to allow flexible profile expansion without touching auth.

### Fields

| Column        | Type           | Constraints                        | Description                                                |
| ------------- | -------------- | ---------------------------------- | ---------------------------------------------------------- |
| `id`          | `uuid`         | PK, default `gen_random_uuid()`    | Primary identifier                                         |
| `user_id`     | `uuid`         | NOT NULL, UNIQUE, FK → `Users(id)` | Owning user                                                |
| `avatar_url`  | `varchar(500)` | nullable                           | Profile picture URL                                        |
| `bio`         | `text`         | nullable, max 500 chars            | Short biography                                            |
| `location`    | `varchar(100)` | nullable                           | Geographical location                                      |
| `preferences` | `jsonb`        | NOT NULL, default `'{}'`           | JSON map of user preferences (sound, theme, notifications) |
| `created_at`  | `timestamptz`  | NOT NULL, default `now()`          | Profile creation                                           |
| `updated_at`  | `timestamptz`  | NOT NULL, default `now()`          | Last profile update                                        |

### Primary Key

- `id` — UUID primary key

### Foreign Keys

| Column    | References  | Constraint                                      |
| --------- | ----------- | ----------------------------------------------- |
| `user_id` | `Users(id)` | `ON DELETE CASCADE` — profile removed with user |

### Indexes

| Index                  | Columns   | Unique           | Purpose                       |
| ---------------------- | --------- | ---------------- | ----------------------------- |
| `profiles_user_id_idx` | `user_id` | Yes (via UNIQUE) | Direct profile lookup by user |

---

## Table: `Ratings`

**Purpose:** Tracks player skill ratings across different game modes. Each player has one rating row per distinct rating type (standard, tournament, speed, etc.). Rating values use an ELO-based system.

### Fields

| Column         | Type          | Constraints                             | Description                                                          |
| -------------- | ------------- | --------------------------------------- | -------------------------------------------------------------------- |
| `id`           | `uuid`        | PK, default `gen_random_uuid()`         | Primary identifier                                                   |
| `player_type`  | `varchar(20)` | NOT NULL, CHECK (`'user'` or `'guest'`) | Discriminator for polymorphic player                                 |
| `player_id`    | `uuid`        | NOT NULL                                | FK — references `Users(id)` or `GuestUsers(id)`                      |
| `rating_type`  | `varchar(20)` | NOT NULL, default `'standard'`          | Game mode: `standard`, `tournament`, `speed`                         |
| `rating`       | `integer`     | NOT NULL, default `1200`                | Current ELO rating                                                   |
| `peak_rating`  | `integer`     | NOT NULL, default `1200`                | Highest rating achieved                                              |
| `games_played` | `integer`     | NOT NULL, default `0`                   | Total games count                                                    |
| `wins`         | `integer`     | NOT NULL, default `0`                   | Wins count                                                           |
| `losses`       | `integer`     | NOT NULL, default `0`                   | Losses count                                                         |
| `draws`        | `integer`     | NOT NULL, default `0`                   | Draws count (backgammon draws are rare but possible in some formats) |
| `updated_at`   | `timestamptz` | NOT NULL, default `now()`               | Last rating change                                                   |
| `created_at`   | `timestamptz` | NOT NULL, default `now()`               | First rating assignment                                              |

### Primary Key

- `id` — UUID primary key

### Foreign Keys

Polymorphic: `player_id` references either `Users(id)` or `GuestUsers(id)` depending on `player_type`. Enforced at application layer; a CHECK constraint + trigger can provide referential integrity if needed.

### Indexes

| Index                       | Columns                                 | Unique | Purpose                        |
| --------------------------- | --------------------------------------- | ------ | ------------------------------ |
| `ratings_player_idx`        | `(player_type, player_id, rating_type)` | Yes    | One rating per player per type |
| `ratings_leaderboard_idx`   | `(rating_type, rating DESC)`            | No     | Leaderboard queries            |
| `ratings_player_lookup_idx` | `(player_type, player_id)`              | No     | Find all ratings for a player  |
| `ratings_updated_at_idx`    | `updated_at`                            | No     | Recently changed ratings       |

---

## Table: `Rooms`

**Purpose:** Lobby categories that organize tables by game type, skill level, or tournament affiliation. Players browse rooms to find tables to join.

### Fields

| Column        | Type           | Constraints                     | Description                                  |
| ------------- | -------------- | ------------------------------- | -------------------------------------------- |
| `id`          | `uuid`         | PK, default `gen_random_uuid()` | Primary identifier                           |
| `name`        | `varchar(100)` | NOT NULL                        | Display name (e.g., "Beginners", "Advanced") |
| `slug`        | `varchar(100)` | NOT NULL, UNIQUE                | URL-friendly identifier                      |
| `description` | `text`         | nullable                        | Room description                             |
| `min_rating`  | `integer`      | nullable                        | Minimum rating to enter (null = no minimum)  |
| `max_rating`  | `integer`      | nullable                        | Maximum rating to enter (null = no maximum)  |
| `sort_order`  | `integer`      | NOT NULL, default `0`           | Display ordering                             |
| `is_active`   | `boolean`      | NOT NULL, default `true`        | Soft delete / visibility                     |
| `created_at`  | `timestamptz`  | NOT NULL, default `now()`       | Room creation                                |
| `updated_at`  | `timestamptz`  | NOT NULL, default `now()`       | Last update                                  |

### Primary Key

- `id` — UUID primary key

### Foreign Keys

None.

### Indexes

| Index                    | Columns                   | Unique | Purpose             |
| ------------------------ | ------------------------- | ------ | ------------------- |
| `rooms_slug_idx`         | `slug`                    | Yes    | URL routing         |
| `rooms_active_order_idx` | `(is_active, sort_order)` | No     | Active room listing |

---

## Table: `Tables`

**Purpose:** Individual game tables within rooms. A table represents a seating area where two players meet to play a match. Tables can be open (waiting for opponents) or occupied.

### Fields

| Column         | Type           | Constraints                     | Description                                 |
| -------------- | -------------- | ------------------------------- | ------------------------------------------- |
| `id`           | `uuid`         | PK, default `gen_random_uuid()` | Primary identifier                          |
| `room_id`      | `uuid`         | NOT NULL, FK → `Rooms(id)`      | Parent room                                 |
| `name`         | `varchar(100)` | nullable                        | Optional custom table name                  |
| `status`       | `varchar(20)`  | NOT NULL, default `'open'`      | `open`, `occupied`, `playing`, `closed`     |
| `is_ranked`    | `boolean`      | NOT NULL, default `true`        | Whether games affect ratings                |
| `match_length` | `integer`      | NOT NULL, default `1`           | Number of games per match (1, 3, 5, 7)      |
| `stakes`       | `integer`      | nullable                        | Optional stake amount (for future wagering) |
| `created_at`   | `timestamptz`  | NOT NULL, default `now()`       | Table creation                              |
| `started_at`   | `timestamptz`  | nullable                        | When first match began                      |
| `closed_at`    | `timestamptz`  | nullable                        | When table was last closed                  |

### Primary Key

- `id` — UUID primary key

### Foreign Keys

| Column    | References  | Constraint                                                       |
| --------- | ----------- | ---------------------------------------------------------------- |
| `room_id` | `Rooms(id)` | `ON DELETE RESTRICT` — prevent deleting rooms with active tables |

### Indexes

| Index                    | Columns                      | Unique | Purpose                           |
| ------------------------ | ---------------------------- | ------ | --------------------------------- |
| `tables_room_status_idx` | `(room_id, status)`          | No     | List open tables in a room        |
| `tables_status_idx`      | `status`                     | No     | Find joinable tables across rooms |
| `tables_created_at_idx`  | `(room_id, created_at DESC)` | No     | Recently created tables           |

---

## Table: `TableParticipants`

**Purpose:** Junction table linking players (users or guests) to the tables they are seated at. A table has exactly two participants when occupied.

### Fields

| Column        | Type          | Constraints                             | Description                                     |
| ------------- | ------------- | --------------------------------------- | ----------------------------------------------- |
| `id`          | `uuid`        | PK, default `gen_random_uuid()`         | Primary identifier                              |
| `table_id`    | `uuid`        | NOT NULL, FK → `Tables(id)`             | The table                                       |
| `player_type` | `varchar(20)` | NOT NULL, CHECK (`'user'` or `'guest'`) | Player discriminator                            |
| `player_id`   | `uuid`        | NOT NULL                                | FK — references `Users(id)` or `GuestUsers(id)` |
| `position`    | `smallint`    | NOT NULL, CHECK (`position IN (1, 2)`)  | Seat position at table                          |
| `joined_at`   | `timestamptz` | NOT NULL, default `now()`               | When player sat down                            |
| `left_at`     | `timestamptz` | nullable                                | When player left                                |

### Primary Key

- `id` — UUID primary key

### Foreign Keys

| Column     | References   | Constraint                               |
| ---------- | ------------ | ---------------------------------------- |
| `table_id` | `Tables(id)` | `ON DELETE CASCADE` — removed with table |

Polymorphic: `player_id` references `Users(id)` or `GuestUsers(id)` via `player_type`.

### Indexes

| Index                              | Columns                    | Unique | Purpose                        |
| ---------------------------------- | -------------------------- | ------ | ------------------------------ |
| `table_participants_table_pos_idx` | `(table_id, position)`     | Yes    | One player per seat            |
| `table_participants_active_idx`    | `(table_id, left_at)`      | No     | Active participants at a table |
| `table_participants_player_idx`    | `(player_type, player_id)` | No     | Find all tables a player is at |

---

## Table: `Matches`

**Purpose:** A competitive series of one or more backgammon games between two players. A match occurs at a specific table and tracks aggregate scores across multiple games.

### Fields

| Column               | Type          | Constraints                             | Description                                                     |
| -------------------- | ------------- | --------------------------------------- | --------------------------------------------------------------- |
| `id`                 | `uuid`        | PK, default `gen_random_uuid()`         | Primary identifier                                              |
| `table_id`           | `uuid`        | NOT NULL, FK → `Tables(id)`             | Parent table                                                    |
| `status`             | `varchar(20)` | NOT NULL, default `'pending'`           | `pending`, `in_progress`, `completed`, `cancelled`, `abandoned` |
| `total_games`        | `integer`     | NOT NULL, default `1`                   | Number of games in this match (best of N)                       |
| `max_score`          | `integer`     | nullable                                | Points needed to win (alternative to total_games)               |
| `winner_player_type` | `varchar(20)` | nullable, CHECK (`'user'` or `'guest'`) | Winner discriminator                                            |
| `winner_player_id`   | `uuid`        | nullable                                | FK — references `Users(id)` or `GuestUsers(id)`                 |
| `score_player_1`     | `integer`     | NOT NULL, default `0`                   | Games won by position 1                                         |
| `score_player_2`     | `integer`     | NOT NULL, default `0`                   | Games won by position 2                                         |
| `started_at`         | `timestamptz` | nullable                                | Match start time                                                |
| `completed_at`       | `timestamptz` | nullable                                | Match end time                                                  |
| `created_at`         | `timestamptz` | NOT NULL, default `now()`               | Record creation                                                 |

### Primary Key

- `id` — UUID primary key

### Foreign Keys

| Column     | References   | Constraint           |
| ---------- | ------------ | -------------------- |
| `table_id` | `Tables(id)` | `ON DELETE RESTRICT` |

### Indexes

| Index                    | Columns                                  | Unique | Purpose                         |
| ------------------------ | ---------------------------------------- | ------ | ------------------------------- |
| `matches_table_id_idx`   | `table_id`                               | No     | All matches at a table          |
| `matches_status_idx`     | `status`                                 | No     | Active/inactive match filtering |
| `matches_player_idx`     | `(winner_player_type, winner_player_id)` | No     | Won matches by player           |
| `matches_started_at_idx` | `(table_id, started_at DESC)`            | No     | Most recent matches at a table  |

---

## Table: `MatchParticipants`

**Purpose:** Associates the two players with a match, capturing who played which side and their outcome. This decouples match participants from table seating, allowing a match to proceed even if table participants change.

### Fields

| Column        | Type          | Constraints                             | Description                                     |
| ------------- | ------------- | --------------------------------------- | ----------------------------------------------- |
| `id`          | `uuid`        | PK, default `gen_random_uuid()`         | Primary identifier                              |
| `match_id`    | `uuid`        | NOT NULL, FK → `Matches(id)`            | The match                                       |
| `player_type` | `varchar(20)` | NOT NULL, CHECK (`'user'` or `'guest'`) | Player discriminator                            |
| `player_id`   | `uuid`        | NOT NULL                                | FK — references `Users(id)` or `GuestUsers(id)` |
| `position`    | `smallint`    | NOT NULL, CHECK (`position IN (1, 2)`)  | Player position in match                        |
| `is_winner`   | `boolean`     | NOT NULL, default `false`               | Whether this player won the match               |

### Primary Key

- `id` — UUID primary key

### Foreign Keys

| Column     | References    | Constraint                               |
| ---------- | ------------- | ---------------------------------------- |
| `match_id` | `Matches(id)` | `ON DELETE CASCADE` — removed with match |

### Indexes

| Index                              | Columns                               | Unique | Purpose                           |
| ---------------------------------- | ------------------------------------- | ------ | --------------------------------- |
| `match_participants_match_pos_idx` | `(match_id, position)`                | Yes    | One player per position per match |
| `match_participants_player_idx`    | `(player_type, player_id)`            | No     | All matches for a player          |
| `match_participants_wins_idx`      | `(player_type, player_id, is_winner)` | No     | Win/loss counting                 |

---

## Table: `Games`

**Purpose:** A single backgammon game within a match. Tracks game-level state including board position, current turn, dice, and result.

### Fields

| Column                  | Type          | Constraints                                         | Description                                                         |
| ----------------------- | ------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| `id`                    | `uuid`        | PK, default `gen_random_uuid()`                     | Primary identifier                                                  |
| `match_id`              | `uuid`        | NOT NULL, FK → `Matches(id)`                        | Parent match                                                        |
| `game_number`           | `integer`     | NOT NULL                                            | Sequential number within match (1-based)                            |
| `state`                 | `varchar(20)` | NOT NULL, default `'not_started'`                   | `not_started`, `in_progress`, `finished`, `cancelled`, `abandoned`  |
| `current_turn_position` | `smallint`    | nullable, CHECK (`current_turn_position IN (1, 2)`) | Whose turn it is (by position)                                      |
| `dice_roll`             | `jsonb`       | nullable                                            | Current dice roll: `[{die: 4, used: false}, {die: 2, used: false}]` |
| `board_state`           | `jsonb`       | nullable                                            | Current board state for recovery/reconnect                          |
| `move_count`            | `integer`     | NOT NULL, default `0`                               | Number of moves played                                              |
| `is_double_cube_active` | `boolean`     | NOT NULL, default `false`                           | Whether the doubling cube is in play                                |
| `double_cube_position`  | `smallint`    | nullable, CHECK (`double_cube_position IN (1, 2)`)  | Who holds the doubling cube                                         |
| `double_cube_value`     | `integer`     | nullable                                            | Current doubling cube value (2, 4, 8, 16, 32, 64)                   |
| `winner_player_type`    | `varchar(20)` | nullable                                            | Winner discriminator                                                |
| `winner_player_id`      | `uuid`        | nullable                                            | FK — winner                                                         |
| `win_type`              | `varchar(20)` | nullable                                            | `normal`, `gammon`, `backgammon`, `resignation`, `timeout`          |
| `win_value`             | `integer`     | NOT NULL, default `1`                               | Point value (affected by gammon/backgammon and doubling cube)       |
| `started_at`            | `timestamptz` | nullable                                            | Game start                                                          |
| `finished_at`           | `timestamptz` | nullable                                            | Game end                                                            |
| `created_at`            | `timestamptz` | NOT NULL, default `now()`                           | Record creation                                                     |

### Primary Key

- `id` — UUID primary key

### Foreign Keys

| Column     | References    | Constraint                               |
| ---------- | ------------- | ---------------------------------------- |
| `match_id` | `Matches(id)` | `ON DELETE CASCADE` — removed with match |

### Indexes

| Index                   | Columns                   | Unique | Purpose                 |
| ----------------------- | ------------------------- | ------ | ----------------------- |
| `games_match_game_idx`  | `(match_id, game_number)` | Yes    | Ordering within match   |
| `games_state_idx`       | `state`                   | No     | Active games            |
| `games_match_state_idx` | `(match_id, state)`       | No     | Active games in a match |

---

## Table: `GameParticipants`

**Purpose:** Links players to individual games, recording their color assignment and game-level outcome.

### Fields

| Column        | Type          | Constraints                                     | Description                                     |
| ------------- | ------------- | ----------------------------------------------- | ----------------------------------------------- |
| `id`          | `uuid`        | PK, default `gen_random_uuid()`                 | Primary identifier                              |
| `game_id`     | `uuid`        | NOT NULL, FK → `Games(id)`                      | The game                                        |
| `player_type` | `varchar(20)` | NOT NULL, CHECK (`'user'` or `'guest'`)         | Player discriminator                            |
| `player_id`   | `uuid`        | NOT NULL                                        | FK — references `Users(id)` or `GuestUsers(id)` |
| `position`    | `smallint`    | NOT NULL, CHECK (`position IN (1, 2)`)          | Player position (1 = first, 2 = second)         |
| `color`       | `varchar(5)`  | NOT NULL, CHECK (`color IN ('white', 'black')`) | Checker color                                   |
| `is_winner`   | `boolean`     | NOT NULL, default `false`                       | Whether this player won                         |

### Primary Key

- `id` — UUID primary key

### Foreign Keys

| Column    | References  | Constraint                              |
| --------- | ----------- | --------------------------------------- |
| `game_id` | `Games(id)` | `ON DELETE CASCADE` — removed with game |

### Indexes

| Index                            | Columns                    | Unique | Purpose                          |
| -------------------------------- | -------------------------- | ------ | -------------------------------- |
| `game_participants_game_pos_idx` | `(game_id, position)`      | Yes    | One player per position per game |
| `game_participants_player_idx`   | `(player_type, player_id)` | No     | All games for a player           |

---

## Table: `Moves`

**Purpose:** Records every move made in a game for validation, replay, and spectator features. Contains the dice roll, the action taken, and board state snapshots at configurable intervals.

### Fields

| Column            | Type          | Constraints                                   | Description                                   |
| ----------------- | ------------- | --------------------------------------------- | --------------------------------------------- |
| `id`              | `uuid`        | PK, default `gen_random_uuid()`               | Primary identifier                            |
| `game_id`         | `uuid`        | NOT NULL, FK → `Games(id)`                    | Parent game                                   |
| `move_number`     | `integer`     | NOT NULL                                      | Sequential move number within game            |
| `player_position` | `smallint`    | NOT NULL, CHECK (`player_position IN (1, 2)`) | Who made this move                            |
| `dice_roll`       | `jsonb`       | NOT NULL                                      | The dice values: `[4, 2]`                     |
| `is_double`       | `boolean`     | NOT NULL, default `false`                     | Whether dice show doubles                     |
| `from_positions`  | `jsonb`       | nullable                                      | Starting points: `[12, 12, 19, 19]`           |
| `to_positions`    | `jsonb`       | nullable                                      | Destination points: `[18, 17, 24, 24]`        |
| `is_bear_off`     | `boolean`     | NOT NULL, default `false`                     | Whether this move bears off checkers          |
| `is_hit`          | `boolean`     | NOT NULL, default `false`                     | Whether this move hits an opponent blot       |
| `board_snapshot`  | `jsonb`       | nullable                                      | Full board state (periodic, not every move)   |
| `metadata`        | `jsonb`       | nullable                                      | Additional move metadata (timing, animations) |
| `created_at`      | `timestamptz` | NOT NULL, default `now()`                     | Move timestamp                                |

### Primary Key

- `id` — UUID primary key

### Foreign Keys

| Column    | References  | Constraint                              |
| --------- | ----------- | --------------------------------------- |
| `game_id` | `Games(id)` | `ON DELETE CASCADE` — removed with game |

### Indexes

| Index                   | Columns                      | Unique | Purpose                      |
| ----------------------- | ---------------------------- | ------ | ---------------------------- |
| `moves_game_move_idx`   | `(game_id, move_number)`     | Yes    | Move ordering and uniqueness |
| `moves_game_chrono_idx` | `(game_id, created_at)`      | No     | Chronological move retrieval |
| `moves_player_idx`      | `(game_id, player_position)` | No     | Filter moves by player       |

---

## Table: `ChatMessages`

**Purpose:** Stores all chat communication in rooms and tables, including system messages (player joined, game started) and player-sent messages.

### Fields

| Column               | Type          | Constraints                                         | Description                                       |
| -------------------- | ------------- | --------------------------------------------------- | ------------------------------------------------- |
| `id`                 | `uuid`        | PK, default `gen_random_uuid()`                     | Primary identifier                                |
| `scope_type`         | `varchar(10)` | NOT NULL, CHECK (`scope_type IN ('room', 'table')`) | Where the message was sent                        |
| `scope_id`           | `uuid`        | NOT NULL                                            | FK — references `Rooms(id)` or `Tables(id)`       |
| `sender_player_type` | `varchar(20)` | nullable, CHECK (`'user'` or `'guest'`)             | Sender discriminator (null = system message)      |
| `sender_player_id`   | `uuid`        | nullable                                            | FK — references `Users(id)` or `GuestUsers(id)`   |
| `message_type`       | `varchar(20)` | NOT NULL, default `'text'`                          | `text`, `system`, `roll`, `move`, `join`, `leave` |
| `content`            | `text`        | NOT NULL                                            | Message body                                      |
| `created_at`         | `timestamptz` | NOT NULL, default `now()`                           | Message timestamp                                 |

### Primary Key

- `id` — UUID primary key

### Foreign Keys

| Column     | References                                            | Constraint                              |
| ---------- | ----------------------------------------------------- | --------------------------------------- |
| `scope_id` | `Rooms(id)` or `Tables(id)` depending on `scope_type` | Application-level referential integrity |

### Indexes

| Index                   | Columns                                   | Unique | Purpose                             |
| ----------------------- | ----------------------------------------- | ------ | ----------------------------------- |
| `chat_scope_chrono_idx` | `(scope_type, scope_id, created_at DESC)` | No     | Load recent messages in scope       |
| `chat_sender_idx`       | `(sender_player_type, sender_player_id)`  | No     | Message history by sender           |
| `chat_created_at_idx`   | `created_at`                              | No     | Global message ordering, moderation |

---

## Table: `Sessions`

**Purpose:** Tracks active authentication sessions for both registered users and guest players. Used for token-based auth, session validation, and concurrent session management.

### Fields

| Column             | Type           | Constraints                             | Description                                     |
| ------------------ | -------------- | --------------------------------------- | ----------------------------------------------- |
| `id`               | `uuid`         | PK, default `gen_random_uuid()`         | Primary identifier                              |
| `player_type`      | `varchar(20)`  | NOT NULL, CHECK (`'user'` or `'guest'`) | Player discriminator                            |
| `player_id`        | `uuid`         | NOT NULL                                | FK — references `Users(id)` or `GuestUsers(id)` |
| `token`            | `varchar(512)` | NOT NULL, UNIQUE                        | Session token (JWT or opaque)                   |
| `token_family`     | `varchar(100)` | nullable                                | Token family for refresh token rotation         |
| `ip_address`       | `inet`         | nullable                                | Client IP at session creation                   |
| `user_agent`       | `text`         | nullable                                | Client user-agent string                        |
| `is_active`        | `boolean`      | NOT NULL, default `true`                | Whether session is valid                        |
| `expires_at`       | `timestamptz`  | NOT NULL                                | Session expiry                                  |
| `last_accessed_at` | `timestamptz`  | NOT NULL, default `now()`               | Last activity on this session                   |
| `created_at`       | `timestamptz`  | NOT NULL, default `now()`               | Session creation                                |

### Primary Key

- `id` — UUID primary key

### Foreign Keys

Polymorphic: `player_id` references `Users(id)` or `GuestUsers(id)`.

### Indexes

| Index                        | Columns                               | Unique | Purpose                         |
| ---------------------------- | ------------------------------------- | ------ | ------------------------------- |
| `sessions_token_idx`         | `token`                               | Yes    | Session lookup on every request |
| `sessions_player_idx`        | `(player_type, player_id)`            | No     | All sessions for a player       |
| `sessions_active_player_idx` | `(player_type, player_id, is_active)` | No     | Active sessions per player      |
| `sessions_expires_idx`       | `expires_at`                          | No     | Cleanup expired sessions        |
| `sessions_last_access_idx`   | `last_accessed_at`                    | No     | Session timeout enforcement     |

---

## Relationship Summary

| Parent                 | Child               | Cardinality | Key                                                  |
| ---------------------- | ------------------- | ----------- | ---------------------------------------------------- |
| `Users`                | `Profiles`          | 1 : 1       | `Profiles.user_id`                                   |
| `Users`                | `GuestUsers`        | 1 : 0..1    | `GuestUsers.converted_user_id`                       |
| `Users`                | `Sessions`          | 1 : 0..N    | `Sessions.player_id` (where `player_type = 'user'`)  |
| `GuestUsers`           | `Sessions`          | 1 : 0..N    | `Sessions.player_id` (where `player_type = 'guest'`) |
| `Users` / `GuestUsers` | `Ratings`           | 1 : 0..N    | `Ratings.player_id`                                  |
| `Users` / `GuestUsers` | `TableParticipants` | 1 : 0..N    | `TableParticipants.player_id`                        |
| `Users` / `GuestUsers` | `MatchParticipants` | 1 : 0..N    | `MatchParticipants.player_id`                        |
| `Users` / `GuestUsers` | `GameParticipants`  | 1 : 0..N    | `GameParticipants.player_id`                         |
| `Users` / `GuestUsers` | `ChatMessages`      | 1 : 0..N    | `ChatMessages.sender_player_id`                      |
| `Rooms`                | `Tables`            | 1 : 0..N    | `Tables.room_id`                                     |
| `Rooms` / `Tables`     | `ChatMessages`      | 1 : 0..N    | `ChatMessages.scope_id`                              |
| `Tables`               | `TableParticipants` | 1 : 2       | `TableParticipants.table_id`                         |
| `Tables`               | `Matches`           | 1 : 0..N    | `Matches.table_id`                                   |
| `Matches`              | `MatchParticipants` | 1 : 2       | `MatchParticipants.match_id`                         |
| `Matches`              | `Games`             | 1 : 0..N    | `Games.match_id`                                     |
| `Games`                | `GameParticipants`  | 1 : 2       | `GameParticipants.game_id`                           |
| `Games`                | `Moves`             | 1 : 0..N    | `Moves.game_id`                                      |

---

## Polymorphic Pattern Note

Several tables use a `(player_type, player_id)` pair to reference either `Users` or `GuestUsers`. This avoids nullable columns for each player type while maintaining referential integrity at the application layer. An alternative would be separate columns (`user_id`, `guest_id`) with a CHECK constraint enforcing exactly one is non-null, but the discriminator pattern was chosen for cleaner querying and unified indexing.

Tables using this pattern:

- `Ratings`
- `TableParticipants`
- `MatchParticipants`
- `GameParticipants`
- `ChatMessages`
- `Sessions`

## Indexing Strategy

The indexing strategy follows these principles:

1. **Unique indexes** enforce business rules (one profile per user, one rating per player per type, one player per seat position)
2. **Composite indexes** serve the most common query patterns (active tables in a room, messages in a scope, moves in a game)
3. **Covering indexes** where possible to avoid table lookups on frequent queries
4. **Descending order** on time-based columns for recent-first queries (chat messages, matches, sessions)
5. **Partial indexes** may be added later for status-based filtering (active sessions, open tables) if query volume justifies them
