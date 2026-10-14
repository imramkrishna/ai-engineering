import { StateGraph, StateSchema } from "@langchain/langgraph";
import z from "zod";
import { TriageState } from "./state.js";

const Input = new StateSchema({
  ticket: z.string(),
});

const Output = new StateSchema({
  category: z.string(),
  draft: z.string(),
});

const builder = new StateGraph(TriageState, {
  input: Input,
  output: Output,
});


