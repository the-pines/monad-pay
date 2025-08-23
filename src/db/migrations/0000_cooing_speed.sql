CREATE TYPE "public"."card_status_e" AS ENUM('active', 'inactive', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."payment_status_e" AS ENUM('started', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."provider_e" AS ENUM('gmail', 'apple', 'wallet');--> statement-breakpoint
CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_card_id" text NOT NULL,
	"stripe_cardholder_id" text NOT NULL,
	"text" text NOT NULL,
	"brand" text NOT NULL,
	"last_4" char(4) NOT NULL,
	"status" "card_status_e" NOT NULL,
	"spending_limit" numeric(20, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"amount" numeric(78, 0) NOT NULL,
	"decimals" integer NOT NULL,
	"tx_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" uuid NOT NULL,
	"payment_id" text NOT NULL,
	"currency" text NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"merchant_name" text NOT NULL,
	"merchant_currency" text NOT NULL,
	"merchant_amount" numeric(20, 2) NOT NULL,
	"status" "payment_status_e" DEFAULT 'started' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"amount" numeric(78, 0) NOT NULL,
	"decimals" integer NOT NULL,
	"sender" text NOT NULL,
	"receiver" text NOT NULL,
	"tx_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"balance" numeric(20, 2) DEFAULT '0.00' NOT NULL,
	"provider" "provider_e" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vaults" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"collaborators" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"address" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executions" ADD CONSTRAINT "executions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaults" ADD CONSTRAINT "vaults_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "u_card_user" ON "cards" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "u_execution_payment" ON "executions" USING btree ("payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "u_execution_tx" ON "executions" USING btree ("tx_hash");--> statement-breakpoint
CREATE INDEX "i_payment_card" ON "payments" USING btree ("card_id");--> statement-breakpoint
CREATE UNIQUE INDEX "u_payment_id" ON "payments" USING btree ("payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "u_transfer_tx" ON "transfers" USING btree ("tx_hash");--> statement-breakpoint
CREATE INDEX "i_transfer_user" ON "transfers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "u_user_address" ON "users" USING btree ("address");--> statement-breakpoint
CREATE INDEX "i_user_name" ON "users" USING btree ("name");--> statement-breakpoint
CREATE INDEX "i_vault_user" ON "vaults" USING btree ("user_id");