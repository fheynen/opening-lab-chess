CREATE TABLE `game_reviews` (
	`game_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`engine_version` text NOT NULL,
	`depth` integer NOT NULL,
	`accuracy` integer NOT NULL,
	`summary_json` text NOT NULL,
	`strengths_json` text NOT NULL,
	`improvements_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_game_id` text NOT NULL,
	`url` text,
	`pgn` text NOT NULL,
	`white` text NOT NULL,
	`black` text NOT NULL,
	`result` text NOT NULL,
	`user_color` text,
	`white_rating` integer,
	`black_rating` integer,
	`speed` text,
	`opening` text,
	`eco` text,
	`played_at` integer,
	`analysis_status` text DEFAULT 'pending' NOT NULL,
	`analysis_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_owner_provider_id_unique` ON `games` (`user_id`,`provider`,`provider_game_id`);--> statement-breakpoint
CREATE INDEX `games_owner_played_idx` ON `games` (`user_id`,`played_at`);--> statement-breakpoint
CREATE INDEX `games_owner_status_idx` ON `games` (`user_id`,`analysis_status`);--> statement-breakpoint
CREATE TABLE `move_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`user_id` text NOT NULL,
	`ply` integer NOT NULL,
	`move_number` integer NOT NULL,
	`side` text NOT NULL,
	`san` text NOT NULL,
	`uci` text NOT NULL,
	`classification` text NOT NULL,
	`cp_loss` integer NOT NULL,
	`win_drop` integer NOT NULL,
	`accuracy` integer NOT NULL,
	`phase` text NOT NULL,
	`fen_before` text NOT NULL,
	`best_move_uci` text,
	`best_move_san` text,
	`motifs_json` text NOT NULL,
	`pv_json` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `moves_game_idx` ON `move_reviews` (`game_id`);--> statement-breakpoint
CREATE INDEX `moves_owner_class_idx` ON `move_reviews` (`user_id`,`classification`);--> statement-breakpoint
CREATE TABLE `opening_progress` (
	`user_id` text NOT NULL,
	`opening_id` text NOT NULL,
	`completed_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `opening_id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text,
	`chess_com_username` text,
	`local_progress_migrated` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `puzzle_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`puzzle_id` text NOT NULL,
	`path_id` text,
	`solved` integer NOT NULL,
	`used_hint` integer DEFAULT false NOT NULL,
	`attempted_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `attempts_owner_puzzle_idx` ON `puzzle_attempts` (`user_id`,`puzzle_id`);