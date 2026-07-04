# Super Admin Guide

## Role Overview

**SUPER_ADMIN** has full system access, including all ADMIN and MODERATOR permissions plus exclusive access to:

- Season lifecycle management
- Security configuration
- Subscription plan management
- Progression system configuration
- Reward system administration

## Season Lifecycle

A season goes through these stages:

```
UPCOMING → ACTIVE → ENDING_SOON → COMPLETED → ARCHIVED
```

### Create Season

```bash
POST /api/admin/seasons
{
  "name": "Season 1",
  "description": "The inaugural season",
  "seasonNumber": 1,
  "startsAt": "2026-08-01T00:00:00Z",
  "endsAt": "2026-10-01T00:00:00Z",
  "battlePasses": [
    { "track": "FREE", "label": "Free Track", "maxLevel": 50, "xpPerLevel": 100 },
    { "track": "PREMIUM", "label": "Premium Track", "maxLevel": 50, "xpPerLevel": 100, "price": 999 }
  ]
}
```

### Activate Season
```bash
POST /api/admin/seasons/:id/activate
```
Previous active season transitions to `COMPLETED`. New season becomes `ACTIVE`.

### Close Season
```bash
POST /api/admin/seasons/:id/close
```
Manually completes a season.

### Archive Season
```bash
POST /api/admin/seasons/:id/archive
```
Hides season from public listing.

### Battle Pass Levels
Levels are auto-generated on season creation. Add rewards:

```bash
POST /api/admin/seasons/levels/:levelId/rewards
{ "rewardType": "COINS", "rewardValue": "500" }
```

Supported reward types: `XP`, `COINS`, `PREMIUM_DAYS`, `AVATAR_FRAME`, `PROFILE_BORDER`, `TITLE`, `EMOJI`, `DICE_SKIN`, `BOARD_THEME`, `TOURNAMENT_TICKET`

### Reset User Progression
```bash
POST /api/admin/seasons/:seasonId/reset
Body: { "userId": "..." }
```

## Subscription Management

### View All Subscriptions
```bash
GET /api/admin/subscriptions?offset=0&limit=20
```

### View Payments
```bash
GET /api/admin/subscriptions/payments?offset=0&limit=20
```

### Change User Plan
```bash
PUT /api/admin/subscriptions/:userId/change
{ "planType": "VIP" }
```

### Cancel Subscription
```bash
PUT /api/admin/subscriptions/:userId/cancel
```

### Extend Subscription
```bash
PUT /api/admin/subscriptions/:userId/extend
{ "days": 30 }
```

## Progression System

### Achievements

```bash
# Create
POST /api/admin/progression/achievements
{ "key": "win_100_games", "name": "Centurion", "description": "Win 100 games", "category": "GAMEPLAY", "xpReward": 500, "requirementType": "game_wins", "requirementValue": 100 }

# Update
PUT /api/admin/progression/achievements/:id

# Delete
DELETE /api/admin/progression/achievements/:id
```

### Missions

```bash
# Create (daily or weekly)
POST /api/admin/progression/missions
{ "key": "daily_login", "title": "Daily Login", "xpReward": 50, "requirementType": "daily_login", "requirementValue": 1, "period": "DAILY" }

# Update
PUT /api/admin/progression/missions/:id

# Delete
DELETE /api/admin/progression/missions/:id
```

## Security Dashboard

```bash
# Summary
GET /api/admin/security/summary
# Returns: failedLogins24h, tokenAbuse24h, cheatAttempts24h, rateLimitViolations24h

# Events (paginated, filterable)
GET /api/admin/security/events?limit=50&eventType=CHEAT_ATTEMPT&severity=HIGH

# User sessions
GET /api/admin/security/sessions/:userId

# Revoke all sessions for a user
POST /api/admin/security/sessions/:userId/revoke-all

# Rate limiter state
GET /api/admin/security/rate-limiter

# Online users
GET /api/admin/security/online
```

## Tournament Management

```bash
# Create tournament
POST /api/admin/tournaments
{ "name": "Summer Championship", "type": "SINGLE_ELIMINATION", "maxPlayers": 16, "startsAt": "..." }

# Override status through lifecycle
PUT /api/admin/tournaments/:id/status
POST /api/admin/tournaments/:id/start
POST /api/admin/tournaments/:id/finish
POST /api/admin/tournaments/:id/cancel

# Delete tournament
DELETE /api/admin/tournaments/:id
```
