ALTER TABLE "approvals" ADD COLUMN "claim_secret_hash" text;--> statement-breakpoint
ALTER TABLE "approvals" ADD COLUMN "claim_secret_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "approvals" ADD COLUMN "claim_secret_consumed_at" timestamp with time zone;