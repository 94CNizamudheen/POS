CREATE TABLE `held_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`order_number` text NOT NULL,
	`order_json` text NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`held_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `held_orders_order_id_unique` ON `held_orders` (`order_id`);