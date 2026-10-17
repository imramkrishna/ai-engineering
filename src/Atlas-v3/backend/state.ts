import { MessagesValue, StateSchema } from "@langchain/langgraph";
import z from "zod";

const source = z.object({
  chunkId: z.string(),
  title: z.string(),
  page: z.number().nullable(),
  content: z.string(),
  score: z.number(),
});

const citation=z.object({
    chunkId:z.string(),
    quote:z.string(),
    verified:z.boolean().default(false),
})
export const AtlasState = new StateSchema({
  messages: MessagesValue,
  question: z.string(),
  intent: z.enum(["lookup", "compare", "chitchat"]).default("lookup"),
  searchQuery: z.string().default(""),
  filters: z.record(z.string(), z.string()).default({}),
  documents: z.array(source).default(()=>[]),
  retrievalAttempt: z.number().default(0),
  answer:z.string().default(""),
  citations:z.array(citation).default(()=>[]),
  generationAttempt:z.number().default(0),
  issues:z.array(z.string()).default(()=>[])
});
