CREATE TYPE "public"."account_type" AS ENUM('Asset', 'Liability', 'Equity', 'Revenue', 'Expense');--> statement-breakpoint
CREATE TYPE "public"."bill_status" AS ENUM('DRAFT', 'APPROVED', 'POSTED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'VOIDED');--> statement-breakpoint
CREATE TYPE "public"."journal_status" AS ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'POSTED', 'REVERSED');--> statement-breakpoint
CREATE TYPE "public"."normal_balance" AS ENUM('Debit', 'Credit');--> statement-breakpoint
CREATE TYPE "public"."party_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('CUSTOMER', 'VENDOR');--> statement-breakpoint
CREATE TYPE "public"."period_status" AS ENUM('OPEN', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('MANUAL', 'OPENING_BALANCE', 'INVOICE', 'CUSTOMER_PAYMENT', 'VENDOR_BILL', 'VENDOR_PAYMENT');--> statement-breakpoint
CREATE TABLE "accounting_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"fiscal_year" integer NOT NULL,
	"period_number" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "period_status" DEFAULT 'OPEN' NOT NULL,
	"closed_by" text,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounting_periods_date_range" CHECK ("accounting_periods"."end_date" >= "accounting_periods"."start_date")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "account_type" NOT NULL,
	"normal_balance" "normal_balance" NOT NULL,
	"parent_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_normal_balance_matches_type" CHECK ((
        ("accounts"."type" = 'Asset' AND "accounts"."normal_balance" = 'Debit') OR
        ("accounts"."type" = 'Expense' AND "accounts"."normal_balance" = 'Debit') OR
        ("accounts"."type" = 'Liability' AND "accounts"."normal_balance" = 'Credit') OR
        ("accounts"."type" = 'Equity' AND "accounts"."normal_balance" = 'Credit') OR
        ("accounts"."type" = 'Revenue' AND "accounts"."normal_balance" = 'Credit')
      ))
);
--> statement-breakpoint
CREATE TABLE "document_counters" (
	"doc_type" varchar(20) NOT NULL,
	"year" integer NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_id_accounts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounting_periods_year_number_unique" ON "accounting_periods" USING btree ("fiscal_year","period_number");--> statement-breakpoint
CREATE INDEX "accounting_periods_status_idx" ON "accounting_periods" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_code_unique" ON "accounts" USING btree ("code");--> statement-breakpoint
CREATE INDEX "accounts_type_idx" ON "accounts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "accounts_parent_idx" ON "accounts" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "document_counters_doc_type_year_pk" ON "document_counters" USING btree ("doc_type","year");