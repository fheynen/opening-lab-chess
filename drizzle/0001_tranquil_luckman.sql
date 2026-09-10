CREATE TABLE `account_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_sessions_user_idx` ON `account_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `account_sessions_expiry_idx` ON `account_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`username_normalized` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`password_iterations` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_username_normalized_unique` ON `accounts` (`username_normalized`);--> statement-breakpoint
CREATE TABLE `auth_attempts` (
	`username_normalized` text PRIMARY KEY NOT NULL,
	`failed_count` integer NOT NULL,
	`window_started_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
