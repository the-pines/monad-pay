ALTER TABLE "cards" RENAME COLUMN "stripe_id" TO "stripe_cardholder_id";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
CREATE INDEX "i_user_name" ON "users" USING btree ("name");