CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"address" text,
	"tax_id" varchar(50),
	"status" "party_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by" varchar(64),
	"created_by_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_bill_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"description" text,
	"quantity" numeric(12, 4) NOT NULL,
	"unit_price" numeric(18, 2) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"tax_amount" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"line_total" numeric(18, 2) NOT NULL,
	"account_id" uuid
);
--> statement-breakpoint
CREATE TABLE "vendor_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_number" varchar(30),
	"vendor_id" uuid NOT NULL,
	"bill_date" date NOT NULL,
	"due_date" date NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"subtotal" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"tax_amount" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"total_amount" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"amount_paid" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"balance_due" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"status" "bill_status" DEFAULT 'DRAFT' NOT NULL,
	"journal_entry_id" uuid,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" varchar(64),
	"created_by_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_allocations" ALTER COLUMN "invoice_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD COLUMN "vendor_bill_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "vendor_id" uuid;--> statement-breakpoint
ALTER TABLE "vendor_bill_lines" ADD CONSTRAINT "vendor_bill_lines_bill_id_vendor_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."vendor_bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_bills" ADD CONSTRAINT "vendor_bills_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_bills" ADD CONSTRAINT "vendor_bills_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "vendors_code_unique" ON "vendors" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "vendors_email_unique" ON "vendors" USING btree ("email");--> statement-breakpoint
CREATE INDEX "vendors_name_idx" ON "vendors" USING btree ("name");--> statement-breakpoint
CREATE INDEX "vendors_status_idx" ON "vendors" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vendor_bill_lines_bill_idx" ON "vendor_bill_lines" USING btree ("bill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_bill_lines_bill_position_unique" ON "vendor_bill_lines" USING btree ("bill_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_bills_number_unique" ON "vendor_bills" USING btree ("bill_number");--> statement-breakpoint
CREATE INDEX "vendor_bills_vendor_status_idx" ON "vendor_bills" USING btree ("vendor_id","status");--> statement-breakpoint
CREATE INDEX "vendor_bills_due_date_idx" ON "vendor_bills" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "vendor_bills_journal_idx" ON "vendor_bills" USING btree ("journal_entry_id");--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_vendor_bill_id_vendor_bills_id_fk" FOREIGN KEY ("vendor_bill_id") REFERENCES "public"."vendor_bills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_allocations_payment_bill_unique" ON "payment_allocations" USING btree ("payment_id","vendor_bill_id");--> statement-breakpoint
CREATE INDEX "payment_allocations_bill_idx" ON "payment_allocations" USING btree ("vendor_bill_id");--> statement-breakpoint
CREATE INDEX "payments_vendor_date_idx" ON "payments" USING btree ("vendor_id","payment_date");--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_invoice_or_bill" CHECK ((("payment_allocations"."invoice_id" IS NOT NULL AND "payment_allocations"."vendor_bill_id" IS NULL) OR ("payment_allocations"."invoice_id" IS NULL AND "payment_allocations"."vendor_bill_id" IS NOT NULL)));