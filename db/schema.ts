import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  usernameNormalized: text("username_normalized").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  passwordIterations: integer("password_iterations").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  uniqueIndex("accounts_username_normalized_unique").on(table.usernameNormalized),
]);

export const accountSessions = sqliteTable("account_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
}, (table) => [
  index("account_sessions_user_idx").on(table.userId),
  index("account_sessions_expiry_idx").on(table.expiresAt),
]);

export const authAttempts = sqliteTable("auth_attempts", {
  usernameNormalized: text("username_normalized").primaryKey(),
  failedCount: integer("failed_count").notNull(),
  windowStartedAt: integer("window_started_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const profiles = sqliteTable("profiles", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name"),
  chessComUsername: text("chess_com_username"),
  localProgressMigrated: integer("local_progress_migrated", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const games = sqliteTable("games", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(),
  providerGameId: text("provider_game_id").notNull(),
  url: text("url"),
  pgn: text("pgn").notNull(),
  white: text("white").notNull(),
  black: text("black").notNull(),
  result: text("result").notNull(),
  userColor: text("user_color"),
  whiteRating: integer("white_rating"),
  blackRating: integer("black_rating"),
  speed: text("speed"),
  opening: text("opening"),
  eco: text("eco"),
  playedAt: integer("played_at"),
  analysisStatus: text("analysis_status").notNull().default("pending"),
  analysisError: text("analysis_error"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  uniqueIndex("games_owner_provider_id_unique").on(table.userId, table.provider, table.providerGameId),
  index("games_owner_played_idx").on(table.userId, table.playedAt),
  index("games_owner_status_idx").on(table.userId, table.analysisStatus),
]);

export const gameReviews = sqliteTable("game_reviews", {
  gameId: text("game_id").primaryKey().references(() => games.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  engineVersion: text("engine_version").notNull(),
  depth: integer("depth").notNull(),
  accuracy: integer("accuracy").notNull(),
  summaryJson: text("summary_json").notNull(),
  strengthsJson: text("strengths_json").notNull(),
  improvementsJson: text("improvements_json").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const moveReviews = sqliteTable("move_reviews", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  ply: integer("ply").notNull(),
  moveNumber: integer("move_number").notNull(),
  side: text("side").notNull(),
  san: text("san").notNull(),
  uci: text("uci").notNull(),
  classification: text("classification").notNull(),
  cpLoss: integer("cp_loss").notNull(),
  winDrop: integer("win_drop").notNull(),
  accuracy: integer("accuracy").notNull(),
  phase: text("phase").notNull(),
  fenBefore: text("fen_before").notNull(),
  bestMoveUci: text("best_move_uci"),
  bestMoveSan: text("best_move_san"),
  motifsJson: text("motifs_json").notNull(),
  pvJson: text("pv_json").notNull(),
}, (table) => [index("moves_game_idx").on(table.gameId), index("moves_owner_class_idx").on(table.userId, table.classification)]);

export const openingProgress = sqliteTable("opening_progress", {
  userId: text("user_id").notNull(),
  openingId: text("opening_id").notNull(),
  completedAt: integer("completed_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.openingId] })]);

export const puzzleAttempts = sqliteTable("puzzle_attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  puzzleId: text("puzzle_id").notNull(),
  pathId: text("path_id"),
  solved: integer("solved", { mode: "boolean" }).notNull(),
  usedHint: integer("used_hint", { mode: "boolean" }).notNull().default(false),
  attemptedAt: integer("attempted_at").notNull(),
}, (table) => [index("attempts_owner_puzzle_idx").on(table.userId, table.puzzleId)]);
