import { z } from 'zod';

export const createRoomSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(100),
  description: z.string().max(500).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export const guestLoginSchema = z.object({
  displayName: z.string().max(50).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const createTableSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
  name: z.string().max(100).optional(),
  isRanked: z.boolean().optional(),
  matchLength: z.number().int().positive().optional(),
});

export const playerStatsParamsSchema = z.object({
  id: z.string().min(1),
});

export const leaderboardQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().max(100).optional(),
});

export const matchHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const tableIdParamsSchema = z.object({
  tableId: z.string().min(1, 'Table ID is required'),
});

export const roomIdParamsSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
});

export const avatarUploadBodySchema = z.object({
  image: z.string().min(1, 'Image is required'),
});

export const adminListUsersQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().max(100).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER']).optional(),
  banned: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  deleted: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
});

export const adminUserIdParamsSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
});

export const adminChangeRoleBodySchema = z.object({
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'], {
    errorMap: () => ({ message: 'Role must be one of: SUPER_ADMIN, ADMIN, MODERATOR, USER' }),
  }),
});

export const adminToggleStatusBodySchema = z.object({
  isActive: z.boolean(),
});

export const adminToggleBanBodySchema = z.object({
  banned: z.boolean(),
});

export const adminToggleModeratorBodySchema = z.object({
  promote: z.boolean(),
});

export const adminAuditLogQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
