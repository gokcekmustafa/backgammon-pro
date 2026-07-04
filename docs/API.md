# API Reference

## Base URL

Production: `https://api.backgammon.example.com`
Development: `http://localhost:3001`

## Authentication

All authenticated endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Auth Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | No | Email/password login |
| POST | `/auth/guest-login` | No | Guest login |
| POST | `/auth/refresh` | No | Refresh access token |
| POST | `/auth/logout` | Yes | Logout (revoke session) |
| POST | `/auth/logout-all` | Yes | Logout all sessions |
| GET | `/auth/sessions` | Yes | List active sessions |

### Login Request
```json
{ "email": "user@example.com", "password": "secret" }
```

### Login Response
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": { "id": "uuid", "email": "user@example.com", "username": "player1", "displayName": "Player 1", "role": "USER" }
}
```

## Health & Metrics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Basic health check |
| GET | `/api/health/ready` | No | Readiness check (DB + WS) |
| GET | `/api/metrics` | No | Full metrics snapshot |
| GET | `/api/cache/stats` | No | Cache hit ratio + size |

## Stats & Leaderboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/stats/player/:id` | No | Player profile stats |
| GET | `/api/stats/player/:id/matches` | No | Player match history |
| GET | `/api/stats/leaderboard` | No | Leaderboard (paginated) |
| GET | `/api/stats/leaderboard/rank` | Yes | Player rank |
| PUT | `/api/stats/profile` | Yes | Update profile |

Query params: `?ratingType=standard&limit=50&offset=0`

## Rooms & Tables

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/rooms` | No | List active rooms |
| GET | `/api/rooms/:slug` | No | Get room by slug |
| POST | `/api/rooms` | Yes | Create room |
| GET | `/api/rooms/:roomId/tables` | No | List tables in room |
| POST | `/api/tables` | Yes | Create table |
| POST | `/api/tables/:tableId/join` | Yes | Join table |
| POST | `/api/tables/:tableId/leave` | Yes | Leave table |

## Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | Yes | List notifications (paginated) |
| GET | `/api/notifications/unread-count` | Yes | Unread count |
| PUT | `/api/notifications/:id/read` | Yes | Mark as read |
| PUT | `/api/notifications/read-all` | Yes | Mark all as read |
| DELETE | `/api/notifications/:id` | Yes | Delete notification |
| PUT | `/api/notifications/:id/archive` | Yes | Archive notification |

Query params: `?limit=20&offset=0&type=SYSTEM_ANNOUNCEMENT&isRead=false`

## Subscriptions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/subscriptions/plans` | No | List plans |
| GET | `/api/subscriptions/current` | Yes | Current subscription |
| GET | `/api/subscriptions/payments` | Yes | Payment history |
| POST | `/api/subscriptions/change` | Yes | Change plan |
| POST | `/api/subscriptions/cancel` | Yes | Cancel subscription |

## Tournaments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/tournaments` | No | List tournaments (paginated) |
| GET | `/api/tournaments/:id` | No | Tournament detail |
| POST | `/api/tournaments/:id/register` | Yes | Register |
| POST | `/api/tournaments/:id/unregister` | Yes | Unregister |
| GET | `/api/tournaments/:id/player-status` | Yes | Player status |
| GET | `/api/tournaments/:id/bracket` | No | Bracket view |

## Social

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/social/search?q=name` | Yes | Search players |
| POST | `/api/social/friends/request` | Yes | Send friend request |
| PUT | `/api/social/friends/accept` | Yes | Accept request |
| PUT | `/api/social/friends/reject` | Yes | Reject request |
| DELETE | `/api/social/friends/:friendId` | Yes | Remove friend |
| GET | `/api/social/friends` | Yes | List friends |
| GET | `/api/social/friends/requests` | Yes | Pending requests |
| GET | `/api/social/friends/sent` | Yes | Sent requests |
| POST | `/api/social/block` | Yes | Block user |
| DELETE | `/api/social/block/:userId` | Yes | Unblock user |
| GET | `/api/social/blocked` | Yes | Blocked list |
| POST | `/api/social/invitations` | Yes | Send invitation |
| PUT | `/api/social/invitations/:id/respond` | Yes | Respond to invitation |
| GET | `/api/social/invitations` | Yes | List invitations |

## Progression (XP / Achievements / Missions)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/progression/xp` | Yes | XP progress + level |
| GET | `/api/progression/xp/history` | Yes | XP history |
| GET | `/api/progression/achievements` | Yes | List achievements |
| GET | `/api/progression/missions` | Yes | Current missions |
| POST | `/api/progression/missions/:id/claim` | Yes | Claim mission reward |

## Seasons & Battle Pass

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/seasons/active` | No | Current active season |
| GET | `/api/seasons` | No | All seasons |
| GET | `/api/seasons/:id` | No | Season details |
| GET | `/api/seasons/:id/user` | Yes | User season progress |
| GET | `/api/seasons/:id/levels` | No | Battle pass levels |
| GET | `/api/seasons/:id/rewards` | Yes | Season rewards |
| POST | `/api/seasons/rewards/:id/claim` | Yes | Claim reward |

## Admin Endpoints

All admin endpoints require SUPER_ADMIN, ADMIN, or MODERATOR role.

### Dashboard
| Method | Path |
|--------|------|
| GET | `/api/admin/dashboard` |

### User Management
| Method | Path |
|--------|------|
| GET | `/api/admin/users` |
| GET | `/api/admin/users/:id` |
| PUT | `/api/admin/users/:id/role` |
| PUT | `/api/admin/users/:id/status` |
| PUT | `/api/admin/users/:id/ban` |
| DELETE | `/api/admin/users/:id` |
| GET | `/api/admin/users/banned` |
| GET | `/api/admin/users/moderators` |
| PUT | `/api/admin/users/:id/moderator` |

### Audit
| Method | Path |
|--------|------|
| GET | `/api/admin/audit` |

### Tables & Games
| Method | Path |
|--------|------|
| GET | `/api/admin/tables` |
| PUT | `/api/admin/tables/:id/lock` |
| PUT | `/api/admin/tables/:id/unlock` |
| POST | `/api/admin/tables/:id/remove-player` |
| DELETE | `/api/admin/tables/:id` |
| GET | `/api/admin/games` |
| POST | `/api/admin/games/:id/force-resign` |
| POST | `/api/admin/games/:id/force-draw` |
| POST | `/api/admin/games/:id/kick` |

### Admin Notifications
| Method | Path |
|--------|------|
| POST | `/api/admin/notifications/broadcast` |
| POST | `/api/admin/notifications/role` |

### Admin Social
| Method | Path |
|--------|------|
| GET | `/api/admin/social/reports` |
| PUT | `/api/admin/social/reports/:id` |

### Admin Subscriptions
| Method | Path |
|--------|------|
| GET | `/api/admin/subscriptions` |
| GET | `/api/admin/subscriptions/payments` |
| PUT | `/api/admin/subscriptions/:userId/change` |
| PUT | `/api/admin/subscriptions/:userId/cancel` |
| PUT | `/api/admin/subscriptions/:userId/extend` |

### Admin Tournaments
| Method | Path |
|--------|------|
| POST | `/api/admin/tournaments` |
| PUT | `/api/admin/tournaments/:id` |
| DELETE | `/api/admin/tournaments/:id` |
| PUT | `/api/admin/tournaments/:id/status` |
| POST | `/api/admin/tournaments/:id/start` |
| POST | `/api/admin/tournaments/:id/finish` |
| POST | `/api/admin/tournaments/:id/cancel` |

### Admin Seasons
| Method | Path |
|--------|------|
| POST | `/api/admin/seasons` |
| PUT | `/api/admin/seasons/:id` |
| POST | `/api/admin/seasons/:id/activate` |
| POST | `/api/admin/seasons/:id/close` |
| POST | `/api/admin/seasons/:id/archive` |
| POST | `/api/admin/seasons/:id/reset` |
| POST | `/api/admin/seasons/levels/:levelId/rewards` |
| DELETE | `/api/admin/seasons/rewards/:rewardId` |

### Admin Progression
| Method | Path |
|--------|------|
| POST | `/api/admin/progression/achievements` |
| PUT | `/api/admin/progression/achievements/:id` |
| DELETE | `/api/admin/progression/achievements/:id` |
| POST | `/api/admin/progression/missions` |
| PUT | `/api/admin/progression/missions/:id` |
| DELETE | `/api/admin/progression/missions/:id` |

### Admin Security
| Method | Path |
|--------|------|
| GET | `/api/admin/security/summary` |
| GET | `/api/admin/security/events` |
| GET | `/api/admin/security/sessions/:userId` |
| POST | `/api/admin/security/sessions/:userId/revoke-all` |
| GET | `/api/admin/security/rate-limiter` |
| GET | `/api/admin/security/online` |

## WebSocket Events

### Connect
```
URL: ws://localhost:3002
On connect: { type: "CONNECTED", connectionId: "conn_N" }
```

### Client → Server
| Type | Auth Required | Payload |
|------|---------------|---------|
| `PING` | No | `{}` |
| `AUTHENTICATE` | No | `{ token: "jwt" }` |
| `JOIN_ROOM` | Yes | `{ roomId }` |
| `LEAVE_ROOM` | Yes | `{ roomId }` |
| `CREATE_TABLE` | Yes | `{ name, roomId }` |
| `JOIN_TABLE` | Yes | `{ tableId }` |
| `LEAVE_TABLE` | Yes | `{ tableId }` |
| `CHAT_MESSAGE` | Yes | `{ content, scopeType, scopeId }` |
| `ROLL_DICE` | Yes | `{}` |
| `MAKE_MOVE` | Yes | `{ from, to, diceUsed }` |
| `RESIGN_GAME` | Yes | `{}` |
| `RECONNECT_GAME` | Yes | `{}` |

### Server → Client
| Type | Payload |
|------|---------|
| `PONG` | `{}` |
| `AUTHENTICATED` | `{ userId }` |
| `ERROR` | `{ message }` |
| `ROOM_UPDATE` | `{ room, tables }` |
| `TABLE_UPDATE` | `{ table }` |
| `GAME_STATE` | `{ state, board, turn, dice }` |
| `GAME_OVER` | `{ winner, winType, score }` |
| `OPPONENT_DISCONNECTED` | `{ userId, timeout }` |
| `OPPONENT_RECONNECTED` | `{ userId }` |
| `CHAT_MESSAGE` | `{ id, sender, content, type, timestamp }` |
| `FRIEND_REQUEST` | `{ senderId, senderDisplayName }` |
| `FRIEND_ONLINE` | `{ userId }` |
| `FRIEND_OFFLINE` | `{ userId }` |
| `INVITATION_RECEIVED` | `{ senderId, senderDisplayName, type, targetId }` |
| `INVITATION_ACCEPTED` | `{ invitationId }` |
| `INVITATION_REJECTED` | `{ invitationId }` |
| `XP_GAINED` | `{ amount, reason, newTotal, level }` |
| `LEVEL_UP` | `{ level }` |
| `ACHIEVEMENT_UNLOCKED` | `{ achievement }` |
| `MISSION_COMPLETED` | `{ mission }` |
| `BATTLE_PASS_LEVEL_UP` | `{ battlePassId, track, level }` |
| `REWARD_CLAIMED` | `{ reward }` |
| `DISCONNECTED` | `{ connectionId }` |
