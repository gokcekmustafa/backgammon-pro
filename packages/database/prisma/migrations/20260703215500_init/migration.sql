-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER');

-- CreateEnum
CREATE TYPE "player_type" AS ENUM ('user', 'guest');

-- CreateEnum
CREATE TYPE "rating_type" AS ENUM ('standard', 'tournament', 'speed');

-- CreateEnum
CREATE TYPE "table_status" AS ENUM ('open', 'occupied', 'playing', 'finished', 'closed');

-- CreateEnum
CREATE TYPE "match_status" AS ENUM ('pending', 'in_progress', 'completed', 'cancelled', 'abandoned');

-- CreateEnum
CREATE TYPE "game_state" AS ENUM ('not_started', 'in_progress', 'finished', 'cancelled', 'abandoned');

-- CreateEnum
CREATE TYPE "checker_color" AS ENUM ('white', 'black');

-- CreateEnum
CREATE TYPE "win_type" AS ENUM ('normal', 'gammon', 'backgammon', 'resignation', 'timeout');

-- CreateEnum
CREATE TYPE "chat_scope_type" AS ENUM ('room', 'table');

-- CreateEnum
CREATE TYPE "message_type" AS ENUM ('text', 'system', 'roll', 'move', 'join', 'leave');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('SYSTEM_ANNOUNCEMENT', 'MAINTENANCE_NOTICE', 'USER_WARNING', 'MODERATOR_MESSAGE', 'FRIEND_REQUEST', 'TOURNAMENT_INVITATION', 'MATCH_INVITATION', 'ACHIEVEMENT_UNLOCKED');

-- CreateEnum
CREATE TYPE "notification_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "subscription_plan_type" AS ENUM ('FREE', 'PREMIUM', 'VIP');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('active', 'cancelled', 'expired', 'paused');

-- CreateEnum
CREATE TYPE "payment_provider" AS ENUM ('stripe', 'iyzico', 'paytr', 'manual');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "tournament_status" AS ENUM ('DRAFT', 'REGISTRATION', 'READY', 'IN_PROGRESS', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "tournament_type" AS ENUM ('SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN');

-- CreateEnum
CREATE TYPE "tournament_visibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "tournament_player_status" AS ENUM ('REGISTERED', 'ACTIVE', 'ELIMINATED', 'WITHDREW');

-- CreateEnum
CREATE TYPE "tournament_match_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "friend_request_status" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "privacy_setting" AS ENUM ('EVERYONE', 'FRIENDS_ONLY', 'NOBODY');

-- CreateEnum
CREATE TYPE "invitation_type" AS ENUM ('MATCH', 'TABLE', 'TOURNAMENT');

-- CreateEnum
CREATE TYPE "invitation_status" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "achievement_category" AS ENUM ('GAMEPLAY', 'COMPETITIVE', 'SOCIAL', 'TOURNAMENT', 'PREMIUM', 'SPECIAL', 'SEASONAL');

-- CreateEnum
CREATE TYPE "mission_period" AS ENUM ('DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "mission_status" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "xp_reason" AS ENUM ('MATCH_PLAYED', 'MATCH_WON', 'GAMMON', 'BACKGAMMON', 'TOURNAMENT_PARTICIPATION', 'TOURNAMENT_VICTORY', 'DAILY_LOGIN', 'DAILY_MISSION', 'WEEKLY_MISSION', 'FRIEND_INVITATION', 'ACHIEVEMENT_UNLOCK', 'SEASON_XP');

-- CreateEnum
CREATE TYPE "season_status" AS ENUM ('UPCOMING', 'ACTIVE', 'ENDING_SOON', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "battle_pass_track" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "reward_type" AS ENUM ('XP', 'COINS', 'PREMIUM_DAYS', 'AVATAR_FRAME', 'PROFILE_BORDER', 'TITLE', 'EMOJI', 'DICE_SKIN', 'BOARD_THEME', 'TOURNAMENT_TICKET');

-- CreateTable
CREATE TABLE "Users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "role" "user_role" NOT NULL DEFAULT 'USER',
    "banned_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,
    "email_verified_at" TIMESTAMPTZ,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestUsers" (
    "id" UUID NOT NULL,
    "display_name" VARCHAR(50) NOT NULL,
    "converted_user_id" UUID,
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "GuestUsers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "avatar_url" VARCHAR(500),
    "bio" TEXT,
    "location" VARCHAR(100),
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ratings" (
    "id" UUID NOT NULL,
    "player_type" "player_type" NOT NULL,
    "player_id" UUID NOT NULL,
    "rating_type" "rating_type" NOT NULL DEFAULT 'standard',
    "rating" INTEGER NOT NULL DEFAULT 1200,
    "peak_rating" INTEGER NOT NULL DEFAULT 1200,
    "games_played" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rooms" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "min_rating" INTEGER,
    "max_rating" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tables" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "name" VARCHAR(100),
    "status" "table_status" NOT NULL DEFAULT 'open',
    "is_ranked" BOOLEAN NOT NULL DEFAULT true,
    "match_length" INTEGER NOT NULL DEFAULT 1,
    "stakes" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ,
    "closed_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableParticipants" (
    "id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "player_type" "player_type" NOT NULL,
    "player_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "TableParticipants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Matches" (
    "id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "status" "match_status" NOT NULL DEFAULT 'pending',
    "total_games" INTEGER NOT NULL DEFAULT 1,
    "max_score" INTEGER,
    "winner_player_type" "player_type",
    "winner_player_id" UUID,
    "score_player_1" INTEGER NOT NULL DEFAULT 0,
    "score_player_2" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchParticipants" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "player_type" "player_type" NOT NULL,
    "player_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "is_winner" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "MatchParticipants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Games" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "game_number" INTEGER NOT NULL,
    "state" "game_state" NOT NULL DEFAULT 'not_started',
    "current_turn_position" INTEGER,
    "dice_roll" JSONB,
    "board_state" JSONB,
    "move_count" INTEGER NOT NULL DEFAULT 0,
    "is_double_cube_active" BOOLEAN NOT NULL DEFAULT false,
    "double_cube_position" INTEGER,
    "double_cube_value" INTEGER,
    "winner_player_type" "player_type",
    "winner_player_id" UUID,
    "win_type" "win_type",
    "win_value" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMPTZ,
    "finished_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameParticipants" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "player_type" "player_type" NOT NULL,
    "player_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "color" "checker_color" NOT NULL,
    "is_winner" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "GameParticipants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Moves" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "move_number" INTEGER NOT NULL,
    "player_position" INTEGER NOT NULL,
    "dice_roll" JSONB NOT NULL,
    "is_double" BOOLEAN NOT NULL DEFAULT false,
    "from_positions" JSONB,
    "to_positions" JSONB,
    "is_bear_off" BOOLEAN NOT NULL DEFAULT false,
    "is_hit" BOOLEAN NOT NULL DEFAULT false,
    "board_snapshot" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Moves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessages" (
    "id" UUID NOT NULL,
    "scope_type" "chat_scope_type" NOT NULL,
    "scope_id" UUID NOT NULL,
    "sender_player_type" "player_type",
    "sender_player_id" UUID,
    "message_type" "message_type" NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ChatMessages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sessions" (
    "id" UUID NOT NULL,
    "player_type" "player_type" NOT NULL,
    "player_id" UUID NOT NULL,
    "token" VARCHAR(512) NOT NULL,
    "token_family" VARCHAR(100),
    "ip_address" INET,
    "user_agent" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "last_accessed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLogs" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "actor_role" "user_role" NOT NULL,
    "target_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "ip" VARCHAR(45),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvents" (
    "id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'INFO',
    "user_id" UUID,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "notification_type" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT,
    "priority" "notification_priority" NOT NULL DEFAULT 'MEDIUM',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ,
    "created_by" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlans" (
    "id" UUID NOT NULL,
    "plan_type" "subscription_plan_type" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "duration_days" INTEGER NOT NULL DEFAULT 30,
    "features" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "SubscriptionPlans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "subscription_status" NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "provider" "payment_provider",
    "provider_subscription_id" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payments" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "provider" "payment_provider" NOT NULL,
    "provider_payment_id" VARCHAR(255),
    "status" "payment_status" NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "paid_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoices" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "number" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "payment_status" NOT NULL DEFAULT 'pending',
    "due_date" TIMESTAMPTZ,
    "paid_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournaments" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "type" "tournament_type" NOT NULL,
    "status" "tournament_status" NOT NULL DEFAULT 'DRAFT',
    "visibility" "tournament_visibility" NOT NULL DEFAULT 'PUBLIC',
    "entryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "prizePool" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "max_players" INTEGER NOT NULL DEFAULT 16,
    "min_players" INTEGER NOT NULL DEFAULT 2,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "registration_ends_at" TIMESTAMPTZ,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentPlayers" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "tournament_player_status" NOT NULL DEFAULT 'REGISTERED',
    "seed" INTEGER NOT NULL DEFAULT 0,
    "registered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eliminated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "TournamentPlayers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentMatches" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "match_index" INTEGER NOT NULL,
    "player1_id" UUID,
    "player2_id" UUID,
    "winner_id" UUID,
    "status" "tournament_match_status" NOT NULL DEFAULT 'PENDING',
    "player1_score" INTEGER NOT NULL DEFAULT 0,
    "player2_score" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "TournamentMatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentPrizes" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "label" VARCHAR(100),
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "percentage" DECIMAL(5,2) DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "TournamentPrizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendRequests" (
    "id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "receiver_id" UUID NOT NULL,
    "status" "friend_request_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "FriendRequests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendships" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "friend_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Friendships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedUsers" (
    "id" UUID NOT NULL,
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedUsers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitations" (
    "id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "receiver_id" UUID NOT NULL,
    "type" "invitation_type" NOT NULL,
    "target_id" UUID,
    "target_name" VARCHAR(200),
    "status" "invitation_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievements" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(100),
    "category" "achievement_category" NOT NULL,
    "xp_reward" INTEGER NOT NULL DEFAULT 0,
    "badge" VARCHAR(100),
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "requirement_type" VARCHAR(100) NOT NULL,
    "requirement_value" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievements" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "achievement_id" UUID NOT NULL,
    "unlocked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProgress" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "total_xp" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "UserProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceHistory" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "xp_reason" NOT NULL,
    "reference_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperienceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMissions" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "xp_reward" INTEGER NOT NULL DEFAULT 0,
    "requirement_type" VARCHAR(100) NOT NULL,
    "requirement_value" INTEGER NOT NULL DEFAULT 1,
    "period" "mission_period" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "DailyMissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionProgress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "mission_id" UUID NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "status" "mission_status" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "MissionProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seasons" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "season_number" INTEGER NOT NULL,
    "status" "season_status" NOT NULL DEFAULT 'UPCOMING',
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattlePasses" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "track" "battle_pass_track" NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "max_level" INTEGER NOT NULL DEFAULT 50,
    "xp_per_level" INTEGER NOT NULL DEFAULT 100,
    "price" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "BattlePasses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattlePassLevels" (
    "id" UUID NOT NULL,
    "battle_pass_id" UUID NOT NULL,
    "level" INTEGER NOT NULL,
    "xp_required" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "BattlePassLevels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSeasons" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "UserSeasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBattlePasses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "battle_pass_id" UUID NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "has_premium" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "UserBattlePasses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonRewards" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "level_id" UUID NOT NULL,
    "reward_type" "reward_type" NOT NULL,
    "reward_value" VARCHAR(500) NOT NULL,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimed_at" TIMESTAMPTZ,
    "user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "SeasonRewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_idx" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_idx" ON "Users"("username");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "Users"("created_at");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "Users"("is_active");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "Users"("role");

-- CreateIndex
CREATE INDEX "users_last_login_idx" ON "Users"("last_login_at");

-- CreateIndex
CREATE INDEX "guest_users_converted_idx" ON "GuestUsers"("converted_user_id");

-- CreateIndex
CREATE INDEX "guest_users_last_seen_idx" ON "GuestUsers"("last_seen_at");

-- CreateIndex
CREATE INDEX "guest_users_created_at_idx" ON "GuestUsers"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_idx" ON "Profiles"("user_id");

-- CreateIndex
CREATE INDEX "ratings_leaderboard_idx" ON "Ratings"("rating_type", "rating" DESC);

-- CreateIndex
CREATE INDEX "ratings_player_lookup_idx" ON "Ratings"("player_type", "player_id");

-- CreateIndex
CREATE INDEX "ratings_updated_at_idx" ON "Ratings"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_player_idx" ON "Ratings"("player_type", "player_id", "rating_type");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_slug_idx" ON "Rooms"("slug");

-- CreateIndex
CREATE INDEX "rooms_active_order_idx" ON "Rooms"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "tables_room_status_idx" ON "Tables"("room_id", "status");

-- CreateIndex
CREATE INDEX "tables_status_idx" ON "Tables"("status");

-- CreateIndex
CREATE INDEX "tables_created_at_idx" ON "Tables"("room_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "table_participants_active_idx" ON "TableParticipants"("table_id", "left_at");

-- CreateIndex
CREATE INDEX "table_participants_player_idx" ON "TableParticipants"("player_type", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "table_participants_table_pos_idx" ON "TableParticipants"("table_id", "position");

-- CreateIndex
CREATE INDEX "matches_table_id_idx" ON "Matches"("table_id");

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "Matches"("status");

-- CreateIndex
CREATE INDEX "matches_player_idx" ON "Matches"("winner_player_type", "winner_player_id");

-- CreateIndex
CREATE INDEX "matches_started_at_idx" ON "Matches"("table_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "match_participants_player_idx" ON "MatchParticipants"("player_type", "player_id");

-- CreateIndex
CREATE INDEX "match_participants_wins_idx" ON "MatchParticipants"("player_type", "player_id", "is_winner");

-- CreateIndex
CREATE INDEX "match_participants_history_idx" ON "MatchParticipants"("player_type", "player_id", "match_id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "match_participants_match_pos_idx" ON "MatchParticipants"("match_id", "position");

-- CreateIndex
CREATE INDEX "games_state_idx" ON "Games"("state");

-- CreateIndex
CREATE INDEX "games_match_state_idx" ON "Games"("match_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "games_match_game_idx" ON "Games"("match_id", "game_number");

-- CreateIndex
CREATE INDEX "game_participants_player_idx" ON "GameParticipants"("player_type", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_participants_game_pos_idx" ON "GameParticipants"("game_id", "position");

-- CreateIndex
CREATE INDEX "moves_game_chrono_idx" ON "Moves"("game_id", "created_at");

-- CreateIndex
CREATE INDEX "moves_player_idx" ON "Moves"("game_id", "player_position");

-- CreateIndex
CREATE UNIQUE INDEX "moves_game_move_idx" ON "Moves"("game_id", "move_number");

-- CreateIndex
CREATE INDEX "chat_scope_chrono_idx" ON "ChatMessages"("scope_type", "scope_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "chat_sender_idx" ON "ChatMessages"("sender_player_type", "sender_player_id");

-- CreateIndex
CREATE INDEX "chat_created_at_idx" ON "ChatMessages"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_idx" ON "Sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_player_idx" ON "Sessions"("player_type", "player_id");

-- CreateIndex
CREATE INDEX "sessions_active_player_idx" ON "Sessions"("player_type", "player_id", "is_active");

-- CreateIndex
CREATE INDEX "sessions_expires_idx" ON "Sessions"("expires_at");

-- CreateIndex
CREATE INDEX "sessions_last_access_idx" ON "Sessions"("last_accessed_at");

-- CreateIndex
CREATE INDEX "audit_log_actor_idx" ON "AuditLogs"("actor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_target_idx" ON "AuditLogs"("target_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "AuditLogs"("action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "security_events_type_chrono_idx" ON "SecurityEvents"("event_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "security_events_user_chrono_idx" ON "SecurityEvents"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "security_events_severity_chrono_idx" ON "SecurityEvents"("severity", "created_at" DESC);

-- CreateIndex
CREATE INDEX "security_events_chrono_idx" ON "SecurityEvents"("created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_read_idx" ON "Notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_user_chrono_idx" ON "Notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_priority_idx" ON "Notifications"("user_id", "priority" DESC);

-- CreateIndex
CREATE INDEX "notifications_expires_idx" ON "Notifications"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_type_idx" ON "SubscriptionPlans"("plan_type");

-- CreateIndex
CREATE INDEX "subscription_plans_active_order_idx" ON "SubscriptionPlans"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "subscriptions_user_status_idx" ON "Subscriptions"("user_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_plan_idx" ON "Subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "subscriptions_expires_idx" ON "Subscriptions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_unique" ON "Subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "payments_subscription_idx" ON "Payments"("subscription_id");

-- CreateIndex
CREATE INDEX "payments_user_chrono_idx" ON "Payments"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "Payments"("status");

-- CreateIndex
CREATE INDEX "payments_provider_idx" ON "Payments"("provider", "provider_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_idx" ON "Invoices"("number");

-- CreateIndex
CREATE INDEX "invoices_user_chrono_idx" ON "Invoices"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "invoices_payment_idx" ON "Invoices"("payment_id");

-- CreateIndex
CREATE INDEX "tournaments_created_by_idx" ON "Tournaments"("created_by_id");

-- CreateIndex
CREATE INDEX "tournaments_status_idx" ON "Tournaments"("status");

-- CreateIndex
CREATE INDEX "tournaments_starts_at_idx" ON "Tournaments"("starts_at");

-- CreateIndex
CREATE INDEX "tournaments_vis_status_idx" ON "Tournaments"("visibility", "status");

-- CreateIndex
CREATE INDEX "tournament_players_status_idx" ON "TournamentPlayers"("tournament_id", "status");

-- CreateIndex
CREATE INDEX "tournament_players_user_idx" ON "TournamentPlayers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_players_unique" ON "TournamentPlayers"("tournament_id", "user_id");

-- CreateIndex
CREATE INDEX "tournament_matches_round_idx" ON "TournamentMatches"("tournament_id", "round");

-- CreateIndex
CREATE INDEX "tournament_matches_status_idx" ON "TournamentMatches"("tournament_id", "status");

-- CreateIndex
CREATE INDEX "tournament_matches_p1_idx" ON "TournamentMatches"("player1_id");

-- CreateIndex
CREATE INDEX "tournament_matches_p2_idx" ON "TournamentMatches"("player2_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_matches_round_match_idx" ON "TournamentMatches"("tournament_id", "round", "match_index");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_prizes_position_idx" ON "TournamentPrizes"("tournament_id", "position");

-- CreateIndex
CREATE INDEX "friend_requests_receiver_status_idx" ON "FriendRequests"("receiver_id", "status");

-- CreateIndex
CREATE INDEX "friend_requests_sender_status_idx" ON "FriendRequests"("sender_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "friend_requests_pair_idx" ON "FriendRequests"("sender_id", "receiver_id");

-- CreateIndex
CREATE INDEX "friendships_friend_idx" ON "Friendships"("friend_id");

-- CreateIndex
CREATE UNIQUE INDEX "friendships_pair_idx" ON "Friendships"("user_id", "friend_id");

-- CreateIndex
CREATE INDEX "blocked_users_blocked_idx" ON "BlockedUsers"("blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_users_pair_idx" ON "BlockedUsers"("blocker_id", "blocked_id");

-- CreateIndex
CREATE INDEX "invitations_receiver_status_idx" ON "Invitations"("receiver_id", "status");

-- CreateIndex
CREATE INDEX "invitations_sender_status_idx" ON "Invitations"("sender_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_unique_idx" ON "Invitations"("sender_id", "receiver_id", "type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_key_idx" ON "Achievements"("key");

-- CreateIndex
CREATE INDEX "achievements_cat_order_idx" ON "Achievements"("category", "sort_order");

-- CreateIndex
CREATE INDEX "achievements_active_idx" ON "Achievements"("is_active");

-- CreateIndex
CREATE INDEX "user_achievements_user_chrono_idx" ON "UserAchievements"("user_id", "unlocked_at" DESC);

-- CreateIndex
CREATE INDEX "user_achievements_achievement_idx" ON "UserAchievements"("achievement_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_unique" ON "UserAchievements"("user_id", "achievement_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_progress_user_idx" ON "UserProgress"("userId");

-- CreateIndex
CREATE INDEX "user_progress_xp_leaderboard_idx" ON "UserProgress"("total_xp" DESC);

-- CreateIndex
CREATE INDEX "user_progress_level_idx" ON "UserProgress"("level" DESC);

-- CreateIndex
CREATE INDEX "xp_history_user_chrono_idx" ON "ExperienceHistory"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "xp_history_user_reason_idx" ON "ExperienceHistory"("user_id", "reason");

-- CreateIndex
CREATE INDEX "xp_history_created_at_idx" ON "ExperienceHistory"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "daily_missions_key_idx" ON "DailyMissions"("key");

-- CreateIndex
CREATE INDEX "missions_period_active_idx" ON "DailyMissions"("period", "is_active");

-- CreateIndex
CREATE INDEX "mission_progress_user_status_idx" ON "MissionProgress"("user_id", "status");

-- CreateIndex
CREATE INDEX "mission_progress_mission_idx" ON "MissionProgress"("mission_id");

-- CreateIndex
CREATE UNIQUE INDEX "mission_progress_unique" ON "MissionProgress"("user_id", "mission_id");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_number_idx" ON "Seasons"("season_number");

-- CreateIndex
CREATE INDEX "seasons_status_idx" ON "Seasons"("status");

-- CreateIndex
CREATE INDEX "seasons_dates_idx" ON "Seasons"("starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "battle_pass_season_track_unique" ON "BattlePasses"("season_id", "track");

-- CreateIndex
CREATE INDEX "battle_pass_level_idx" ON "BattlePassLevels"("battle_pass_id", "level");

-- CreateIndex
CREATE UNIQUE INDEX "battle_pass_level_unique" ON "BattlePassLevels"("battle_pass_id", "level");

-- CreateIndex
CREATE INDEX "user_season_xp_leaderboard_idx" ON "UserSeasons"("season_id", "xp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_season_unique" ON "UserSeasons"("user_id", "season_id");

-- CreateIndex
CREATE INDEX "user_battle_pass_level_idx" ON "UserBattlePasses"("battle_pass_id", "level" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_battle_pass_unique" ON "UserBattlePasses"("user_id", "battle_pass_id");

-- CreateIndex
CREATE INDEX "season_rewards_user_season_idx" ON "SeasonRewards"("user_id", "season_id");

-- CreateIndex
CREATE INDEX "season_rewards_level_idx" ON "SeasonRewards"("level_id");

-- AddForeignKey
ALTER TABLE "GuestUsers" ADD CONSTRAINT "fk_guest_users_converted_user" FOREIGN KEY ("converted_user_id") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profiles" ADD CONSTRAINT "fk_profiles_user" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tables" ADD CONSTRAINT "fk_tables_room" FOREIGN KEY ("room_id") REFERENCES "Rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableParticipants" ADD CONSTRAINT "fk_table_participants_table" FOREIGN KEY ("table_id") REFERENCES "Tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matches" ADD CONSTRAINT "fk_matches_table" FOREIGN KEY ("table_id") REFERENCES "Tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipants" ADD CONSTRAINT "fk_match_participants_match" FOREIGN KEY ("match_id") REFERENCES "Matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Games" ADD CONSTRAINT "fk_games_match" FOREIGN KEY ("match_id") REFERENCES "Matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameParticipants" ADD CONSTRAINT "fk_game_participants_game" FOREIGN KEY ("game_id") REFERENCES "Games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Moves" ADD CONSTRAINT "fk_moves_game" FOREIGN KEY ("game_id") REFERENCES "Games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifications" ADD CONSTRAINT "fk_notifications_user" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscriptions" ADD CONSTRAINT "fk_subscriptions_user" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscriptions" ADD CONSTRAINT "fk_subscriptions_plan" FOREIGN KEY ("plan_id") REFERENCES "SubscriptionPlans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payments" ADD CONSTRAINT "fk_payments_subscription" FOREIGN KEY ("subscription_id") REFERENCES "Subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payments" ADD CONSTRAINT "fk_payments_user" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoices" ADD CONSTRAINT "fk_invoices_payment" FOREIGN KEY ("payment_id") REFERENCES "Payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoices" ADD CONSTRAINT "fk_invoices_user" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournaments" ADD CONSTRAINT "fk_tournaments_created_by" FOREIGN KEY ("created_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlayers" ADD CONSTRAINT "fk_tournament_players_tournament" FOREIGN KEY ("tournament_id") REFERENCES "Tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlayers" ADD CONSTRAINT "fk_tournament_players_user" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMatches" ADD CONSTRAINT "fk_tournament_matches_tournament" FOREIGN KEY ("tournament_id") REFERENCES "Tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMatches" ADD CONSTRAINT "fk_tournament_matches_p1" FOREIGN KEY ("player1_id") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMatches" ADD CONSTRAINT "fk_tournament_matches_p2" FOREIGN KEY ("player2_id") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPrizes" ADD CONSTRAINT "fk_tournament_prizes_tournament" FOREIGN KEY ("tournament_id") REFERENCES "Tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequests" ADD CONSTRAINT "fk_friend_requests_sender" FOREIGN KEY ("sender_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequests" ADD CONSTRAINT "fk_friend_requests_receiver" FOREIGN KEY ("receiver_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendships" ADD CONSTRAINT "fk_friendships_user" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendships" ADD CONSTRAINT "fk_friendships_friend" FOREIGN KEY ("friend_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedUsers" ADD CONSTRAINT "fk_blocked_users_blocker" FOREIGN KEY ("blocker_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedUsers" ADD CONSTRAINT "fk_blocked_users_blocked" FOREIGN KEY ("blocked_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitations" ADD CONSTRAINT "fk_invitations_sender" FOREIGN KEY ("sender_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitations" ADD CONSTRAINT "fk_invitations_receiver" FOREIGN KEY ("receiver_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievements" ADD CONSTRAINT "fk_user_achievements_user" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievements" ADD CONSTRAINT "fk_user_achievements_achievement" FOREIGN KEY ("achievement_id") REFERENCES "Achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProgress" ADD CONSTRAINT "fk_user_progress_user" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceHistory" ADD CONSTRAINT "fk_xp_history_user" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionProgress" ADD CONSTRAINT "fk_mission_progress_user" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionProgress" ADD CONSTRAINT "fk_mission_progress_mission" FOREIGN KEY ("mission_id") REFERENCES "DailyMissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattlePasses" ADD CONSTRAINT "fk_battle_pass_season" FOREIGN KEY ("season_id") REFERENCES "Seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattlePassLevels" ADD CONSTRAINT "fk_battle_pass_level_bp" FOREIGN KEY ("battle_pass_id") REFERENCES "BattlePasses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSeasons" ADD CONSTRAINT "fk_user_season_user" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSeasons" ADD CONSTRAINT "fk_user_season_season" FOREIGN KEY ("season_id") REFERENCES "Seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBattlePasses" ADD CONSTRAINT "fk_user_battle_pass_user" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBattlePasses" ADD CONSTRAINT "fk_user_battle_pass_bp" FOREIGN KEY ("battle_pass_id") REFERENCES "BattlePasses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonRewards" ADD CONSTRAINT "fk_season_reward_season" FOREIGN KEY ("season_id") REFERENCES "Seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonRewards" ADD CONSTRAINT "fk_season_reward_level" FOREIGN KEY ("level_id") REFERENCES "BattlePassLevels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonRewards" ADD CONSTRAINT "fk_season_reward_user" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
