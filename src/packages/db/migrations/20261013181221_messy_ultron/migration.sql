CREATE TYPE "task_status" AS ENUM('processing', 'completed');--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'processing'::"task_status",
	"created_by" text,
	"created_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "document_chunks" DROP CONSTRAINT "document_chunks_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "document_chunks" ADD COLUMN "tsv" tsvector;--> statement-breakpoint
ALTER TABLE "document_chunks" DROP COLUMN "user_id";--> statement-breakpoint
CREATE INDEX "document_chunks_embedding_idx" ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "document_chunks_tsv_idx" ON "document_chunks" USING gin ("tsv");--> statement-breakpoint
CREATE INDEX "document_id_idx" ON "documents" ("id");--> statement-breakpoint
CREATE INDEX "documents_user_id_idx" ON "documents" ("user_id");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");