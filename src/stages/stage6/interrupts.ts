import { interrupt, Command } from "@langchain/langgraph";
import { TriageState } from "./state.js";
const decision = interrupt({
  question: "Should I send this reply?",
  draft: TriageState.State.draft,
});


