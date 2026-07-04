# Admin Guide

## Access

Admin panel is at `/admin`. Requires one of: `SUPER_ADMIN`, `ADMIN`, or `MODERATOR` role.

## Dashboard

Overview showing:
- Total users, banned users
- Active tables, games today
- New users today, online users

## User Management

### Search Users
- Filter by: search query, role, banned status, deleted status
- Paginated: `?limit=20&offset=0`

### User Details
View/edit:
- Email, username, display name
- Role, active status, ban status
- Profile (avatar, bio, location)
- Account stats (guest conversions)

### Actions
- **Change role**: Promote to MODERATOR, ADMIN, or demote
- **Toggle active status**: Enable/disable account
- **Ban/Unban**: Restrict access
- **Delete**: Soft-delete account

### Moderator Management
- View all moderators
- Promote/demote users to/from MODERATOR

### Banned Users
- View all banned users with ban timestamps

## Live Tables

View all active tables with:
- Table ID, name, room, status
- Player count, duration
- Lock/unlock tables
- Remove players
- Delete tables

## Live Games

View all active games with:
- Players, score, status, current turn
- Force resign, force draw, kick players

## Audit Log

Track all admin actions with:
- Actor (admin/mod/super admin)
- Target user
- Action type
- IP address
- Timestamp

Filterable by actor, target, action type.

## Notifications

### Broadcast
Send notification to all users:
```json
{ "type": "SYSTEM_ANNOUNCEMENT", "title": "...", "body": "...", "priority": "HIGH" }
```

### Role-based
Send to users with specific role:
```json
{ "type": "MAINTENANCE_NOTICE", "title": "...", "body": "...", "role": "USER", "priority": "URGENT" }
```

## Seasons

See [SUPER_ADMIN_GUIDE.md](SUPER_ADMIN_GUIDE.md) for season management (requires SUPER_ADMIN or ADMIN).

## Security

### Events Log
View security events filtered by:
- Event type (FAILED_LOGIN, TOKEN_ABUSE, CHEAT_ATTEMPT, etc.)
- Severity (INFO, WARNING, HIGH, CRITICAL)
- User
- Date range

### User Sessions
- View all active sessions for a user
- Revoke all sessions for a user

### Rate Limiter
View current rate limiter state:
- Global request count
- Active user buckets, IP buckets

### Online Users
View currently connected users.

## Permissions Matrix

| Feature | SUPER_ADMIN | ADMIN | MODERATOR |
|---------|-------------|-------|-----------|
| Dashboard | ✓ | ✓ | ✓ |
| User search/view | ✓ | ✓ | ✓ |
| Change user role | ✓ | ✓ | ✗ |
| Ban/unban users | ✓ | ✓ | ✓ |
| Delete users | ✓ | ✓ | ✗ |
| Manage moderators | ✓ | ✓ | ✗ |
| Live tables/games | ✓ | ✓ | ✓ |
| Table actions | ✓ | ✓ | ✓ |
| Force resign/draw | ✓ | ✓ | ✓ |
| Audit log | ✓ | ✓ | ✓ |
| Notifications | ✓ | ✓ | ✓ |
| Season management | ✓ | ✓ | ✗ |
| Security dashboard | ✓ | ✓ | ✗ |
| Subscription management | ✓ | ✓ | ✗ |
| Tournament management | ✓ | ✓ | ✓ |
