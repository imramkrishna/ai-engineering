import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  pgEnum,
  vector,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema.js";

export const documentStatus = pgEnum("document_status", [
  "queued",
  "processing",
  "completed",
  "failed",
]);
export const ingestionJobStatus = pgEnum("ingestion_job_status", [
  "queued",
  "processing",
  "completed",
  "failed",
]);

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Owner of the document
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // Original filename
  name: varchar("name", { length: 255 }).notNull(),

  // MIME type: application/pdf, etc.
  mimeType: varchar("mime_type", { length: 100 }).notNull(),

  // File size in bytes
  size: integer("size").notNull(),

  // Where the original file is stored
  storageKey: text("storage_key").notNull(),

  // Optional hash to detect duplicate/unchanged files
  contentHash: varchar("content_hash", { length: 64 }),

  // Processing state
  status: documentStatus("status").default("queued").notNull(),

  // Useful for displaying errors in the UI
  errorMessage: text("error_message"),

  // Number of chunks generated
  chunkCount: integer("chunk_count"),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  processedAt: timestamp("processed_at", {
    withTimezone: true,
  }),
});

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId:text("user_id").references(()=>user.id),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),

    // Actual chunk text
    content: text("content").notNull(),

    // Position of this chunk within the document
    chunkIndex: integer("chunk_index").notNull(),

    // Page number, section, etc.
    metadata: jsonb("metadata"),

    // Must match your embedding model's dimensions
    embedding: vector("embedding", {
      dimensions: 1024,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("document_chunks_document_id_idx").on(table.documentId)],
);

export const ingestionJobs = pgTable(
  "ingestion_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    status: ingestionJobStatus("status").default("queued").notNull(),

    // Useful for showing progress in the frontend
    totalChunks: integer("total_chunks"),
    processedChunks: integer("processed_chunks").default(0).notNull(),

    // Number of embedding batches processed
    totalBatches: integer("total_batches"),
    processedBatches: integer("processed_batches").default(0).notNull(),

    errorMessage: text("error_message"),

    startedAt: timestamp("started_at", {
      withTimezone: true,
    }),

    completedAt: timestamp("completed_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("ingestion_jobs_document_id_idx").on(table.documentId),
    index("ingestion_jobs_user_id_idx").on(table.userId),
    index("ingestion_jobs_status_idx").on(table.status),
  ],
);
