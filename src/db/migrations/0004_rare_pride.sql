ALTER TABLE "cards" DROP CONSTRAINT "cards_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "executions" DROP CONSTRAINT "executions_payment_id_payments_id_fk";
--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_card_id_cards_id_fk";
--> statement-breakpoint
ALTER TABLE "vaults" DROP CONSTRAINT "vaults_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "cards" ALTER COLUMN "last_4" SET DATA TYPE char;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executions" ADD CONSTRAINT "executions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaults" ADD CONSTRAINT "vaults_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;