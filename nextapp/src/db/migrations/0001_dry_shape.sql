ALTER TABLE "payments" ALTER COLUMN "amount" SET DATA TYPE numeric(20, 0);--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "merchant_amount" SET DATA TYPE numeric(20, 0);